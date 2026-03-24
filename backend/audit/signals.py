"""
audit/signals.py — Global, self-healing audit trail.

Listens to pre_save / post_save / post_delete on every application model.
Creates one ActivityLog row per event with a rich, human-readable description.

Registered automatically via AuditConfig.ready() in audit/apps.py.
"""
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

from audit.models import ActivityLog
from cases.models import Case, Suspect
from evidence.models import EvidenceFile
from accounts.models import CustomUser


# ── Helpers ───────────────────────────────────────────────────────────────────

def _log(action, model_name, target, details, user=None):
    """Create a cryptographically chained ActivityLog entry."""
    try:
        # 1. Get the latest log's hash to form the chain
        last_log = ActivityLog.objects.all().order_by('-id').first()
        prev_hash = last_log.sha512_hash if last_log else "GENESIS_BLOCK"

        # 2. Initial create (gets the timestamp from DB)
        log = ActivityLog.objects.create(
            user=user,
            action=action,
            model_name=model_name,
            target=target,
            details=details,
            prev_hash=prev_hash
        )

        # 3. Finalize hash with the auto-generated timestamp
        log.sha512_hash = log.calculate_payload_hash()
        log.save(update_fields=['sha512_hash'])

    except Exception:
        pass  # Never let audit signals crash the main operation


def _resolve_user(instance):
    """Try common user-FK patterns on an instance."""
    for attr in ('uploaded_by', 'current_custodian', 'created_by', 'added_by'):
        u = getattr(instance, attr, None)
        if u is not None:
            return u
    return None


def _snapshot(instance, fields):
    """Return a dict of {field: current_db_value} BEFORE the save."""
    try:
        old = instance.__class__.objects.get(pk=instance.pk)
        return {f: getattr(old, f) for f in fields}
    except instance.__class__.DoesNotExist:
        return {}


def _diff_text(old_vals, new_instance, fields, label_map=None):
    """Build 'X changed from A → B; Y changed from C → D' string."""
    parts = []
    label_map = label_map or {}
    for field in fields:
        old_v = old_vals.get(field)
        new_v = getattr(new_instance, field, None)
        if old_v != new_v:
            label = label_map.get(field, field.replace('_', ' ').title())
            # Use display values if available
            get_disp = f'get_{field}_display'
            if hasattr(new_instance, get_disp):
                try:
                    old_v = dict(new_instance._meta.get_field(field).choices).get(old_v, old_v)
                    new_v = getattr(new_instance, get_disp)()
                except Exception:
                    pass
            parts.append(f"{label} changed from \"{old_v}\" → \"{new_v}\"")
    return "; ".join(parts) if parts else "No tracked fields changed."


# ── EvidenceFile Signals ───────────────────────────────────────────────────────

_EV_TRACK = ['custody_status', 'is_verified', 'description', 'category', 'current_custodian_id']

@receiver(pre_save, sender='evidence.EvidenceFile')
def evidence_pre_save(sender, instance, **kwargs):
    if instance.pk:
        instance._pre_save_snapshot = _snapshot(instance, _EV_TRACK)
    else:
        instance._pre_save_snapshot = {}


@receiver(post_save, sender='evidence.EvidenceFile')
def evidence_post_save(sender, instance, created, **kwargs):
    user = _resolve_user(instance)
    model = 'EvidenceFile'
    target = f"evidence:{instance.pk}"

    if created:
        _log(
            action=ActivityLog.ACTION_CREATE,
            model_name=model,
            target=target,
            user=user,
            details=(
                f"Evidence file '{instance.original_filename}' uploaded to case "
                f"{instance.case.fir_number}. "
                f"Category: {instance.get_category_display()}. "
                f"Size: {instance.file_size:,} bytes. "
                f"SHA-512: {instance.sha512_hash[:32]}…"
            ),
        )
    else:
        old = getattr(instance, '_pre_save_snapshot', {})
        diff = _diff_text(old, instance, _EV_TRACK)
        if old:
            # Specific rich messages for key transitions
            old_status = old.get('custody_status')
            new_status = instance.custody_status
            old_verified = old.get('is_verified')
            new_verified = instance.is_verified

            if old_verified is False and new_verified is True:
                details = (
                    f"Evidence SHA-512 verified ✓ INTACT — "
                    f"'{instance.original_filename}' passed integrity check. "
                    f"Custody: {instance.get_custody_status_display()}."
                )
                _log(ActivityLog.ACTION_CHECK, model, target, user=user, details=details)
                return

            if old_status and old_status != new_status:
                details = (
                    f"Chain-of-custody transfer: '{instance.original_filename}' "
                    f"moved from {dict(sender.CUSTODY_CHOICES).get(old_status, old_status)} "
                    f"→ {instance.get_custody_status_display()}."
                )
                _log(ActivityLog.ACTION_TRANSFER, model, target, user=user, details=details)
                return

        _log(ActivityLog.ACTION_UPDATE, model, target, user=user, details=diff)


@receiver(post_delete, sender='evidence.EvidenceFile')
def evidence_post_delete(sender, instance, **kwargs):
    user = _resolve_user(instance)
    _log(
        action=ActivityLog.ACTION_DELETE,
        model_name='EvidenceFile',
        target=f"evidence:{instance.pk}",
        user=user,
        details=(
            f"CRITICAL SHRED: Evidence file '{instance.original_filename}' "
            f"permanently deleted from case {instance.case.fir_number}."
        ),
    )


# ── Case Signals ──────────────────────────────────────────────────────────────

_CASE_TRACK = ['status', 'title', 'description']

@receiver(pre_save, sender=Case)
def case_pre_save(sender, instance, **kwargs):
    if instance.pk:
        instance._pre_save_snapshot = _snapshot(instance, _CASE_TRACK)
    else:
        instance._pre_save_snapshot = {}


@receiver(post_save, sender=Case)
def case_post_save(sender, instance, created, **kwargs):
    user = getattr(instance, 'created_by', None)
    model = 'Case'
    target = f"case:{instance.pk}"

    if created:
        _log(
            action=ActivityLog.ACTION_CREATE,
            model_name=model,
            target=target,
            user=user,
            details=(
                f"Case '{instance.title}' registered. "
                f"FIR: {instance.fir_number}. "
                f"Initial status: {instance.get_status_display()}."
            ),
        )
    else:
        old = getattr(instance, '_pre_save_snapshot', {})
        old_status = old.get('status')
        new_status = instance.status
        if old_status and old_status != new_status:
            details = (
                f"Case '{instance.title}' (FIR: {instance.fir_number}) status changed "
                f"from {dict(sender.STATUS_CHOICES).get(old_status, old_status)} "
                f"→ {instance.get_status_display()}."
            )
        else:
            details = _diff_text(old, instance, _CASE_TRACK)
            if not old:
                details = f"Case '{instance.title}' (FIR: {instance.fir_number}) updated."
        _log(ActivityLog.ACTION_UPDATE, model, target, user=user, details=details)


@receiver(post_delete, sender=Case)
def case_post_delete(sender, instance, **kwargs):
    _log(
        action=ActivityLog.ACTION_DELETE,
        model_name='Case',
        target=f"case:{instance.pk}",
        user=getattr(instance, 'created_by', None),
        details=f"Case '{instance.title}' (FIR: {instance.fir_number}) deleted from system.",
    )


# ── Suspect Signals ───────────────────────────────────────────────────────────

@receiver(post_save, sender=Suspect)
def suspect_post_save(sender, instance, created, **kwargs):
    user = getattr(instance, 'added_by', None)
    action = ActivityLog.ACTION_CREATE if created else ActivityLog.ACTION_UPDATE
    details = (
        f"Suspect '{instance.name}' {'added to' if created else 'updated in'} "
        f"case {instance.case.fir_number}."
        + (f" National ID: {instance.national_id}." if instance.national_id and created else "")
    )
    _log(action, 'Suspect', f"suspect:{instance.pk}", user=user, details=details)


@receiver(post_delete, sender=Suspect)
def suspect_post_delete(sender, instance, **kwargs):
    _log(
        action=ActivityLog.ACTION_DELETE,
        model_name='Suspect',
        target=f"suspect:{instance.pk}",
        user=getattr(instance, 'added_by', None),
        details=f"Suspect '{instance.name}' removed from case {instance.case.fir_number}.",
    )


# ── CustomUser Signals ────────────────────────────────────────────────────────

_USER_TRACK = ['role', 'is_active', 'department']

@receiver(pre_save, sender=CustomUser)
def user_pre_save(sender, instance, **kwargs):
    if instance.pk:
        instance._pre_save_snapshot = _snapshot(instance, _USER_TRACK)
    else:
        instance._pre_save_snapshot = {}


@receiver(post_save, sender=CustomUser)
def user_post_save(sender, instance, created, **kwargs):
    model = 'CustomUser'
    target = f"user:{instance.pk}"

    if created:
        _log(
            action=ActivityLog.ACTION_CREATE,
            model_name=model,
            target=target,
            user=instance,
            details=(
                f"Officer account created: {instance.get_full_name()} "
                f"[{instance.badge_number}] assigned role {instance.role}."
                + (" (Superuser/Root)" if instance.is_superuser else "")
            ),
        )
    else:
        old = getattr(instance, '_pre_save_snapshot', {})
        old_active = old.get('is_active')
        new_active = instance.is_active
        old_role = old.get('role')
        new_role = instance.role

        if old_active is True and new_active is False:
            details = f"Officer {instance.get_full_name()} [{instance.badge_number}] account SUSPENDED."
        elif old_active is False and new_active is True:
            details = f"Officer {instance.get_full_name()} [{instance.badge_number}] account RE-ACTIVATED."
        elif old_role and old_role != new_role:
            details = (
                f"Officer {instance.get_full_name()} [{instance.badge_number}] "
                f"role changed from {old_role} → {new_role}."
            )
        else:
            diff = _diff_text(old, instance, _USER_TRACK)
            details = f"Officer {instance.get_full_name()} [{instance.badge_number}] updated. {diff}"

        _log(ActivityLog.ACTION_UPDATE, model, target, user=instance, details=details)


@receiver(post_delete, sender=CustomUser)
def user_post_delete(sender, instance, **kwargs):
    _log(
        action=ActivityLog.ACTION_DELETE,
        model_name='CustomUser',
        target=f"user:{instance.pk}",
        details=f"Officer account {instance.get_full_name()} [{instance.badge_number}] permanently removed.",
    )

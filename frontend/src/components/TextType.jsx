import React, { useState, useEffect } from 'react';
import './TextType.css';

const TextType = ({ 
  text = [], 
  typingSpeed = 50, 
  deletingSpeed = 30, 
  pauseDuration = 2000, 
  loop = true, 
  className = '', 
  textColors = [], 
  cursorCharacter = '_' 
}) => {
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeedState, setTypingSpeedState] = useState(typingSpeed);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const handleType = () => {
      const i = loopNum % text.length;
      const fullText = text[i];

      if (isDeleting) {
        setCurrentText(fullText.substring(0, currentText.length - 1));
        setTypingSpeedState(deletingSpeed);
      } else {
        setCurrentText(fullText.substring(0, currentText.length + 1));
        setTypingSpeedState(typingSpeed);
      }

      if (!isDeleting && currentText === fullText) {
        setTimeout(() => setIsDeleting(true), pauseDuration);
      } else if (isDeleting && currentText === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleType, typingSpeedState);
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, loopNum, text, typingSpeed, deletingSpeed, pauseDuration, typingSpeedState]);

  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorTimer);
  }, []);

  const colorIndex = loopNum % text.length;
  const color = textColors[colorIndex] || 'inherit';

  return (
    <div className={`text-type ${className}`}>
      <span className="text-type__content" style={{ color }}>
        {currentText}
      </span>
      <span className={`text-type__cursor ${!showCursor ? 'text-type__cursor--hidden' : ''}`}>
        {cursorCharacter}
      </span>
    </div>
  );
};

export default TextType;

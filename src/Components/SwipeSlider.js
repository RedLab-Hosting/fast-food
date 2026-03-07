import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconCheckCircle } from './Icons';

function SwipeSlider({ onSwipeSuccess, text = "Desliza cuando entregues el pedido", disabledUntil }) {
  const [sliderVal, setSliderVal] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const containerRef = useRef(null);
  const thumbRef = useRef(null);

  useEffect(() => {
    if (!disabledUntil) {
      setTimeLeft(0);
      return;
    }
    const updateTime = () => {
      const remaining = disabledUntil.getTime() - Date.now();
      setTimeLeft(Math.max(0, remaining));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [disabledUntil]);

  const isDisabled = timeLeft > 0;

  const startDrag = (e) => {
    if (isDisabled) return;
    setIsDragging(true);
  };

  const onDrag = useCallback((e) => {
    if (!isDragging || !containerRef.current || !thumbRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const thumbWidth = thumbRef.current.offsetWidth;
    const maxVal = containerRect.width - thumbWidth - 8; // 8 is padding
    
    // Get clientX from either mouse or touch event
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    
    let newVal = clientX - containerRect.left - (thumbWidth / 2);
    if (newVal < 0) newVal = 0;
    if (newVal > maxVal) newVal = maxVal;
    
    setSliderVal(newVal);

    if (newVal >= maxVal * 0.95) {
      setIsDragging(false);
      setSliderVal(maxVal);
      onSwipeSuccess();
    }
  }, [isDragging, onSwipeSuccess]);

  const endDrag = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (!containerRef.current || !thumbRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const thumbWidth = thumbRef.current.offsetWidth;
    const maxVal = containerRect.width - thumbWidth - 8;
    
    if (sliderVal < maxVal * 0.95) {
      setSliderVal(0); // Snap back
    }
  }, [isDragging, sliderVal]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', endDrag);
      window.addEventListener('touchmove', onDrag, { passive: false });
      window.addEventListener('touchend', endDrag);
    } else {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', onDrag);
      window.removeEventListener('touchend', endDrag);
    }
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', onDrag);
      window.removeEventListener('touchend', endDrag);
    };
  }, [isDragging, onDrag, endDrag]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-14 bg-black rounded-full overflow-hidden flex items-center shadow-[0_4px_15px_rgba(0,0,0,0.2)] select-none border-2 border-gray-800"
    >
      {/* Background track text */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${sliderVal > 20 ? 'opacity-30' : 'opacity-100'}`}>
        <span className="text-white font-black text-sm uppercase tracking-widest pl-10">
          {isDisabled 
            ? `${Math.floor(timeLeft / 60000).toString().padStart(2, '0')}:${Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0')} para habilitar` 
            : text}
        </span>
      </div>

      {/* The Draggable Thumb */}
      <div 
        ref={thumbRef}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        // onClick removed to force swipe only
        style={{ transform: `translateX(${sliderVal}px)` }}
        className={`absolute left-1 w-12 h-12 ${isDisabled ? 'bg-gray-600' : 'bg-green-500 hover:bg-green-400 cursor-grab active:cursor-grabbing shadow-lg'} rounded-full flex items-center justify-center transition-colors z-10 ${!isDragging && sliderVal === 0 ? 'transition-transform duration-300 ease-out' : ''}`}
      >
        <IconCheckCircle className={`w-6 h-6 ${isDisabled ? 'text-gray-400' : 'text-white'}`} />
      </div>

      {/* Fill bar behind thumb */}
      <div 
        style={{ width: `${sliderVal + 24}px` }}
        className={`absolute left-0 h-full bg-green-500/20 z-0 ${!isDragging && sliderVal === 0 ? 'transition-all duration-300 ease-out' : ''}`}
      />
    </div>
  );
}

export default SwipeSlider;

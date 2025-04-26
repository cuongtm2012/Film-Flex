import React, { useState, useCallback } from 'react';
import { Mic, MicOff, Eye, EyeOff, FileAudio, Settings } from 'lucide-react';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useVoiceControl, VoiceCommand } from '@/hooks/use-voice-control';

export default function AccessibilityControls() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { 
    isScreenReaderActive, 
    isHighContrastActive,
    isLargeTextActive,
    isVoiceControlActive,
    toggleScreenReader,
    toggleHighContrast,
    toggleLargeText,
    toggleVoiceControl,
    announceToScreenReader
  } = useAccessibility();
  
  // Memoized command handlers to avoid recreating on each render
  const handleScreenReaderToggle = useCallback(() => {
    toggleScreenReader();
    if (!isScreenReaderActive) {
      announceToScreenReader("Screen reader activated");
    }
  }, [toggleScreenReader, announceToScreenReader]);
  
  const handleHighContrastToggle = useCallback(() => {
    toggleHighContrast();
  }, [toggleHighContrast]);
  
  const handleLargeTextToggle = useCallback(() => {
    toggleLargeText();
  }, [toggleLargeText]);
  
  const handleVoiceControlToggle = useCallback(() => {
    toggleVoiceControl();
  }, [toggleVoiceControl]);
  
  // Define voice commands for voice control
  const commands: VoiceCommand[] = [
    {
      command: "Toggle screen reader",
      aliases: ["screen reader", "reader", "enable reader", "disable reader"],
      handler: handleScreenReaderToggle,
      description: "Turns screen reader on or off"
    },
    {
      command: "Toggle high contrast",
      aliases: ["high contrast", "contrast", "increase contrast"],
      handler: handleHighContrastToggle,
      description: "Switches to high contrast mode for better visibility"
    },
    {
      command: "Toggle large text",
      aliases: ["larger text", "bigger text", "larger font"],
      handler: handleLargeTextToggle,
      description: "Makes text larger for easier reading"
    },
    {
      command: "Hide menu",
      aliases: ["close menu", "close options", "hide options"],
      handler: () => setIsExpanded(false),
      description: "Closes the accessibility menu"
    }
  ];
  
  // Use voice control hook
  const { isSupported } = useVoiceControl({
    commands,
    enabled: isVoiceControlActive
  });
  
  // Simple check for voice support as fallback
  const isVoiceSupported = isSupported || (typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window));
  
  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Main accessibility button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={isExpanded ? "Close accessibility options" : "Open accessibility options"}
        aria-expanded={isExpanded}
      >
        <Settings className="w-6 h-6" />
      </button>
      
      {/* Expanded accessibility controls */}
      {isExpanded && (
        <div className="absolute bottom-16 left-0 bg-zinc-900 rounded-lg shadow-lg overflow-hidden border border-zinc-700 w-64">
          <div className="p-3 bg-zinc-800 border-b border-zinc-700">
            <h3 className="text-white font-medium">Accessibility Options</h3>
          </div>
          
          <div className="p-3 space-y-3">
            {/* Screen Reader Control */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-blue-400" />
                <span className="text-white text-sm">Screen Reader</span>
              </div>
              <button
                onClick={handleScreenReaderToggle}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isScreenReaderActive 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-zinc-700 hover:bg-zinc-600 text-gray-200'
                }`}
                aria-pressed={isScreenReaderActive}
                aria-label={isScreenReaderActive ? "Turn off screen reader" : "Turn on screen reader"}
              >
                {isScreenReaderActive ? 'On' : 'Off'}
              </button>
            </div>
            
            {/* High Contrast Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isHighContrastActive ? (
                  <EyeOff className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Eye className="w-5 h-5 text-yellow-400" />
                )}
                <span className="text-white text-sm">High Contrast</span>
              </div>
              <button
                onClick={handleHighContrastToggle}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isHighContrastActive 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                    : 'bg-zinc-700 hover:bg-zinc-600 text-gray-200'
                }`}
                aria-pressed={isHighContrastActive}
                aria-label={isHighContrastActive ? "Turn off high contrast" : "Turn on high contrast"}
              >
                {isHighContrastActive ? 'On' : 'Off'}
              </button>
            </div>
            
            {/* Font Size Control */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center text-green-400 font-bold">A</span>
                <span className="text-white text-sm">Larger Text</span>
              </div>
              <button
                onClick={handleLargeTextToggle}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isLargeTextActive 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-zinc-700 hover:bg-zinc-600 text-gray-200'
                }`}
                aria-pressed={isLargeTextActive}
                aria-label={isLargeTextActive ? "Use normal text size" : "Use larger text size"}
              >
                {isLargeTextActive ? 'On' : 'Off'}
              </button>
            </div>
            
            {/* Voice Control */}
            {isVoiceSupported && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isVoiceControlActive ? (
                    <Mic className="w-5 h-5 text-red-400" />
                  ) : (
                    <MicOff className="w-5 h-5 text-red-400" />
                  )}
                  <span className="text-white text-sm">Voice Control</span>
                </div>
                <button
                  onClick={handleVoiceControlToggle}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isVoiceControlActive 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-zinc-700 hover:bg-zinc-600 text-gray-200'
                  }`}
                  aria-pressed={isVoiceControlActive}
                  aria-label={isVoiceControlActive ? "Turn off voice control" : "Turn on voice control"}
                >
                  {isVoiceControlActive ? 'On' : 'Off'}
                </button>
              </div>
            )}
            
            {/* Help text */}
            <div className="mt-3 pt-3 border-t border-zinc-700">
              <p className="text-gray-400 text-xs">
                Press <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-xs">Tab</kbd> to navigate 
                and <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-xs">Enter</kbd> to activate buttons.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
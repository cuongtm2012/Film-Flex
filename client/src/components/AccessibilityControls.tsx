import React, { useState } from 'react';
import { Mic, MicOff, Eye, EyeOff, VolumeX, Volume2, FileAudio, Settings } from 'lucide-react';
import { useVoiceControl } from '@/hooks/use-voice-control';

interface AccessibilityControlsProps {
  onToggleScreenReader?: () => void;
  isScreenReaderActive?: boolean;
  onToggleHighContrast?: () => void;
  isHighContrastActive?: boolean;
  onToggleFontSize?: () => void;
  onToggleVoiceControl?: (enabled: boolean) => void;
  isVoiceControlActive?: boolean;
  className?: string;
}

export default function AccessibilityControls({
  onToggleScreenReader,
  isScreenReaderActive = false,
  onToggleHighContrast,
  isHighContrastActive = false,
  onToggleFontSize,
  onToggleVoiceControl,
  isVoiceControlActive = false,
  className = ''
}: AccessibilityControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Define commands for voice control
  const voiceCommands = [
    {
      command: "Toggle screen reader",
      aliases: ["screen reader", "reader", "enable reader", "disable reader"],
      handler: () => onToggleScreenReader && onToggleScreenReader(),
      description: "Turns screen reader on or off"
    },
    {
      command: "Toggle high contrast",
      aliases: ["high contrast", "contrast", "increase contrast"],
      handler: () => onToggleHighContrast && onToggleHighContrast(),
      description: "Switches to high contrast mode for better visibility"
    },
    {
      command: "Increase font size",
      aliases: ["larger text", "bigger text", "larger font"],
      handler: () => onToggleFontSize && onToggleFontSize(),
      description: "Makes text larger for easier reading"
    }
  ];
  
  // Use voice control hook
  const { isListening, isSupported } = useVoiceControl({
    commands: voiceCommands,
    enabled: isVoiceControlActive
  });
  
  const toggleVoiceControl = () => {
    if (onToggleVoiceControl) {
      onToggleVoiceControl(!isVoiceControlActive);
    }
  };
  
  return (
    <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
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
                onClick={onToggleScreenReader}
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
                onClick={onToggleHighContrast}
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
                onClick={onToggleFontSize}
                className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-gray-200"
                aria-label="Increase font size"
              >
                Resize
              </button>
            </div>
            
            {/* Voice Control */}
            {isSupported && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isListening ? (
                    <Mic className="w-5 h-5 text-red-400" />
                  ) : (
                    <MicOff className="w-5 h-5 text-red-400" />
                  )}
                  <span className="text-white text-sm">Voice Control</span>
                </div>
                <button
                  onClick={toggleVoiceControl}
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
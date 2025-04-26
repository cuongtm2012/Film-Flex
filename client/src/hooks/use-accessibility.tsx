import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface AccessibilityContextType {
  isScreenReaderActive: boolean;
  isHighContrastActive: boolean;
  isLargeTextActive: boolean;
  isVoiceControlActive: boolean;
  toggleScreenReader: () => void;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  toggleVoiceControl: (value?: boolean) => void;
  announceToScreenReader: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  // State for accessibility settings - with SSR-safety check
  const [isScreenReaderActive, setIsScreenReaderActive] = useState<boolean>(false);
  const [isHighContrastActive, setIsHighContrastActive] = useState<boolean>(false);
  const [isLargeTextActive, setIsLargeTextActive] = useState<boolean>(false);
  const [isVoiceControlActive, setIsVoiceControlActive] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Load saved preferences from localStorage - only runs once after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedScreenReader = localStorage.getItem('isScreenReaderActive');
        const savedHighContrast = localStorage.getItem('isHighContrastActive');
        const savedLargeText = localStorage.getItem('isLargeTextActive');
        
        if (savedScreenReader) setIsScreenReaderActive(savedScreenReader === 'true');
        if (savedHighContrast) setIsHighContrastActive(savedHighContrast === 'true');
        if (savedLargeText) setIsLargeTextActive(savedLargeText === 'true');
      } catch (error) {
        console.error('Failed to load accessibility preferences', error);
      } finally {
        setIsInitialized(true);
      }
    }
  }, []);
  
  // Save preferences when they change - only runs after initialization
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('isScreenReaderActive', isScreenReaderActive.toString());
      localStorage.setItem('isHighContrastActive', isHighContrastActive.toString());
      localStorage.setItem('isLargeTextActive', isLargeTextActive.toString());
    } catch (error) {
      console.error('Failed to save accessibility preferences', error);
    }
  }, [isScreenReaderActive, isHighContrastActive, isLargeTextActive, isInitialized]);
  
  // Apply global styles based on preferences
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (isHighContrastActive) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Large text mode
    if (isLargeTextActive) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
  }, [isHighContrastActive, isLargeTextActive]);
  
  // Handle screen reader announcements
  useEffect(() => {
    if (!announcement || !isScreenReaderActive) return;
    
    const clearAnnouncement = () => setAnnouncement('');
    
    // Clear the announcement after it's been read
    const timeoutId = setTimeout(clearAnnouncement, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [announcement, isScreenReaderActive]);
  
  // Toggle functions
  const toggleScreenReader = () => setIsScreenReaderActive(prev => !prev);
  const toggleHighContrast = () => setIsHighContrastActive(prev => !prev);
  const toggleLargeText = () => setIsLargeTextActive(prev => !prev);
  const toggleVoiceControl = (value?: boolean) => 
    setIsVoiceControlActive(prev => typeof value === 'boolean' ? value : !prev);
  
  // Announce message to screen reader
  const announceToScreenReader = (message: string) => {
    if (isScreenReaderActive) {
      setAnnouncement(message);
    }
  };
  
  return (
    <AccessibilityContext.Provider
      value={{
        isScreenReaderActive,
        isHighContrastActive,
        isLargeTextActive,
        isVoiceControlActive,
        toggleScreenReader,
        toggleHighContrast,
        toggleLargeText,
        toggleVoiceControl,
        announceToScreenReader,
      }}
    >
      {children}
      
      {/* Aria-live region for screen reader announcements */}
      {isScreenReaderActive && (
        <div 
          aria-live="assertive" 
          className="sr-only" 
          role="status"
        >
          {announcement}
        </div>
      )}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  
  return context;
};
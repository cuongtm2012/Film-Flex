import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './use-toast';

// Define interfaces for Speech Recognition API since they're not in default TypeScript types
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      }
    }
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface VoiceCommand {
  command: string;
  aliases?: string[];
  handler: () => void;
  description: string;
}

interface UseVoiceControlProps {
  commands: VoiceCommand[];
  enabled?: boolean;
}

export function useVoiceControl({ commands, enabled = false }: UseVoiceControlProps) {
  const [isListening, setIsListening] = useState(false);
  const [availableCommands, setAvailableCommands] = useState<VoiceCommand[]>([]);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Process voice commands - Using a ref for available commands to avoid dependency cycle
  const commandsRef = useRef(commands);
  
  // Update commands ref when they change
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);
  
  const processCommand = useCallback((text: string) => {
    // Special case for "help" command
    if (text === 'help' || text === 'what can i say') {
      const commandList = commandsRef.current.map(cmd => `"${cmd.command}": ${cmd.description}`).join(', ');
      toast({
        title: "Available voice commands",
        description: commandList,
      });
      return;
    }
    
    // Check all commands and their aliases
    for (const command of commandsRef.current) {
      if (
        text === command.command.toLowerCase() || 
        (command.aliases && command.aliases.some(alias => text === alias.toLowerCase()))
      ) {
        command.handler();
        toast({
          title: "Command recognized",
          description: `Executing: ${command.command}`,
        });
        return;
      }
    }
    
    // If we get here, no command matched
    if (text.length > 2) { // Only show for meaningful attempts, not background noise
      toast({
        title: "Command not recognized",
        description: `Try saying "help" for available commands`,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Check if browser supports speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check for browser support
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      // Setup recognition event handlers
      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (enabled) {
          // Restart if enabled is still true
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.log('Recognition error on restart', e);
          }
        }
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone access denied",
            description: "Please enable microphone access to use voice commands",
            variant: "destructive",
          });
          setIsListening(false);
        }
      };
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.resultIndex;
        const result = event.results[current][0].transcript.trim().toLowerCase();
        setTranscript(result);
        
        // Process the command
        processCommand(result);
      };
    } else {
      setIsSupported(false);
      toast({
        title: "Voice control not supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive",
      });
    }
    
    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
  }, [toast, enabled, processCommand]);
  
  // Update available commands when commands prop changes
  useEffect(() => {
    setAvailableCommands(commands);
  }, [commands]);
  
  // Start/stop recognition based on enabled prop
  useEffect(() => {
    if (!recognitionRef.current) return;
    
    if (enabled && !isListening) {
      try {
        recognitionRef.current.start();
        toast({
          title: "Voice control activated",
          description: "Try saying 'help' to see available commands",
        });
      } catch (e) {
        console.error('Failed to start speech recognition', e);
      }
    } else if (!enabled && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Failed to stop speech recognition', e);
      }
    }
  }, [enabled, isListening]);
  
  // We already defined processCommand earlier, so we don't need this duplicate definition
  
  const startListening = useCallback(() => {
    if (isSupported && !isListening && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start speech recognition', e);
      }
    }
  }, [isSupported, isListening]);
  
  const stopListening = useCallback(() => {
    if (isSupported && isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Failed to stop speech recognition', e);
      }
    }
  }, [isSupported, isListening]);
  
  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    availableCommands
  };
}
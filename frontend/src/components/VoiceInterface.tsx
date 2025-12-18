import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send, Volume2, X, Loader2, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { intentAPI, walletAPI } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";

interface VoiceInterfaceProps {
  onClose: () => void;
}

const VoiceInterface = ({ onClose }: VoiceInterfaceProps) => {
  const { user } = useAuth();
  const { usdcBalance, loadBalance } = useWallet();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioResponseUrl, setAudioResponseUrl] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Get backend base URL for audio files
  const BACKEND_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript("Listening...");
      toast({
        title: "Recording Started",
        description: "Speak your command clearly",
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Please grant microphone permissions",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const executeAction = async (action: any, intent: string, preserveBalanceResult: boolean = false) => {
    try {
      let result: any = null;

      switch (action.type) {
        case 'deposit':
          // Navigate to deposit or show deposit UI
          toast({
            title: "Deposit Requested",
            description: `Preparing to deposit ${action.params.amount} ${action.params.currency}`,
          });
          result = { type: 'deposit', message: `Deposit ${action.params.amount} ${action.params.currency}` };
          break;

        case 'withdraw':
        case 'transfer':
          // Navigate to transfer or show transfer UI
          toast({
            title: "Transfer Requested",
            description: `Preparing to transfer ${action.params.amount} ${action.params.currency}`,
          });
          result = { type: 'transfer', message: `Transfer ${action.params.amount} ${action.params.currency} to ${action.params.to || action.params.target}` };
          break;

        case 'invoice':
          // Navigate to merchant/invoice creation
          toast({
            title: "Invoice Requested",
            description: `Creating invoice for ${action.params.amount} ${action.params.currency}`,
          });
          result = { type: 'invoice', message: `Invoice: ${action.params.amount} ${action.params.currency}` };
          break;

        default:
          result = { type: action.type, message: `Action: ${action.type}` };
      }

      // Only set action result if we're not preserving a balance result
      if (!preserveBalanceResult) {
        setActionResult(result);
      } else {
        console.log('💰 Preserving balance result, not overwriting with action result');
      }
    } catch (error: any) {
      console.error('Error executing action:', error);
      if (!preserveBalanceResult) {
        setActionResult({ error: error.message });
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setAiResponse("");
    setAudioResponseUrl(null);
    setActionResult(null);
    setTranscript(""); // Clear previous transcript

    try {
      // Use streaming mode to get transcript immediately
      const response = await intentAPI.processIntent(
        audioBlob,
        undefined,
        user?.id,
        'en',
        // Callback to receive transcript as soon as it's available
        (transcript: string) => {
          console.log('📝 Received transcript early:', transcript);
          setTranscript(transcript);
        }
      );

      // Update transcript if not already set (fallback for non-streaming)
      if (!transcript) {
        setTranscript(response.transcript || "");
      }
      setAiResponse(response.explanation || "");

      // Handle check_balance intent - fetch and display actual balance
      if (response.intent === 'check_balance') {
        console.log('💰 Fetching balance for check_balance intent...');
        try {
          // Fetch balance directly from API to get latest value
          const balanceResponse = await walletAPI.getBalance();
          console.log('💰 Balance response:', balanceResponse);
          
          if (balanceResponse.success && balanceResponse.balances) {
            // Find USDC balance
            const usdcBalanceEntry = balanceResponse.balances.find((b: any) => {
              const currency = b.currency?.toUpperCase() || b.token?.symbol?.toUpperCase() || '';
              return currency === 'USDC' || currency === 'USD' || currency.startsWith('USDC');
            });
            
            let balance = 0;
            if (usdcBalanceEntry) {
              const amount = usdcBalanceEntry.amount || '0';
              balance = parseFloat(amount);
              // Handle smallest units if needed
              if (balance > 1000 && !amount.includes('.')) {
                balance = balance / 1e6;
              }
            }
            
            const balanceResult = {
              type: 'balance',
              message: `Your current USDC balance is $${balance.toFixed(2)}`,
              balance: balance,
            };
            console.log('💰 Setting balance result:', balanceResult);
            setActionResult(balanceResult);
            // Store in a variable that persists through async operations
            (window as any).__lastBalanceResult = balanceResult;
          } else {
            console.warn('💰 Balance response not successful:', balanceResponse);
            setActionResult({ 
              type: 'balance', 
              message: 'Unable to fetch balance at this time'
            });
          }
        } catch (error: any) {
          console.error('❌ Error fetching balance:', error);
          setActionResult({ 
            type: 'balance', 
            message: 'Unable to fetch balance at this time',
            error: error.message 
          });
        }
      } else {
        // Clear action result for non-balance intents
        console.log('🧹 Clearing action result for intent:', response.intent);
        setActionResult(null);
      }

      // Execute actions if provided (but preserve balance result if it was set)
      // Check if we have a balance result stored globally before executing actions
      const balanceResultToPreserve = (window as any).__lastBalanceResult;
      const shouldPreserveBalance = balanceResultToPreserve && balanceResultToPreserve.type === 'balance';
      
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          await executeAction(action, response.intent, shouldPreserveBalance);
        }
        // Restore balance result if it was set (in case executeAction was called before we set preserveBalanceResult)
        if (shouldPreserveBalance) {
          console.log('💰 Restoring balance result after action execution:', balanceResultToPreserve);
          setActionResult(balanceResultToPreserve);
        }
      }

      // Play audio response if available (preserve balance result)
      if (response.audioResponseURL) {
        // Construct full URL to audio file
        const fullAudioUrl = response.audioResponseURL.startsWith('http') 
          ? response.audioResponseURL 
          : `${BACKEND_BASE_URL}${response.audioResponseURL}`;
        
        console.log('🔊 Setting audio URL, preserving actionResult:', actionResult);
        setAudioResponseUrl(fullAudioUrl);
        if (audioRef.current) {
          audioRef.current.src = fullAudioUrl;
          audioRef.current.onplay = () => {
            console.log('🔊 Audio started playing, actionResult:', actionResult);
            setIsPlayingAudio(true);
          };
          audioRef.current.onended = () => {
            console.log('🔊 Audio ended, actionResult:', actionResult);
            setIsPlayingAudio(false);
          };
          audioRef.current.onpause = () => {
            setIsPlayingAudio(false);
          };
          try {
            await audioRef.current.play();
            console.log('🔊 Audio play() called successfully, actionResult:', actionResult);
          } catch (playError) {
            console.error('Error playing audio:', playError);
            toast({
              title: "Audio Playback",
              description: "Click the play button to hear the response",
            });
          }
        }
      }
      
      console.log('✅ processAudio completed, final actionResult:', actionResult);
    } catch (error: any) {
      console.error('Error processing intent:', error);
      setAiResponse(`Sorry, I couldn't process that: ${error.message}`);
      toast({
        title: "Processing Error",
        description: error.message || "Failed to process your request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    setIsProcessing(true);
    setTranscript(textInput);
    const inputText = textInput;
    setTextInput("");
    setAiResponse("");
    setActionResult(null);

    try {
      const response = await intentAPI.processIntent(
        undefined,
        inputText,
        user?.id,
        'en'
      );

      setAiResponse(response.explanation || "");

      // Handle check_balance intent - fetch and display actual balance
      if (response.intent === 'check_balance') {
        console.log('💰 Fetching balance for check_balance intent (text)...');
        try {
          // Fetch balance directly from API to get latest value
          const balanceResponse = await walletAPI.getBalance();
          console.log('💰 Balance response:', balanceResponse);
          
          if (balanceResponse.success && balanceResponse.balances) {
            // Find USDC balance
            const usdcBalanceEntry = balanceResponse.balances.find((b: any) => {
              const currency = b.currency?.toUpperCase() || b.token?.symbol?.toUpperCase() || '';
              return currency === 'USDC' || currency === 'USD' || currency.startsWith('USDC');
            });
            
            let balance = 0;
            if (usdcBalanceEntry) {
              const amount = usdcBalanceEntry.amount || '0';
              balance = parseFloat(amount);
              // Handle smallest units if needed
              if (balance > 1000 && !amount.includes('.')) {
                balance = balance / 1e6;
              }
            }
            
            const balanceResult = {
              type: 'balance',
              message: `Your current USDC balance is $${balance.toFixed(2)}`,
              balance: balance,
            };
            console.log('💰 Setting balance result:', balanceResult);
            setActionResult(balanceResult);
            // Store in a variable that persists through async operations
            (window as any).__lastBalanceResult = balanceResult;
          } else {
            console.warn('💰 Balance response not successful:', balanceResponse);
            setActionResult({ 
              type: 'balance', 
              message: 'Unable to fetch balance at this time'
            });
          }
        } catch (error: any) {
          console.error('❌ Error fetching balance:', error);
          setActionResult({ 
            type: 'balance', 
            message: 'Unable to fetch balance at this time',
            error: error.message 
          });
        }
      } else {
        // Clear action result for non-balance intents
        console.log('🧹 Clearing action result for intent:', response.intent);
        setActionResult(null);
      }

      // Execute actions if provided (but preserve balance result if it was set)
      // Check if we have a balance result stored globally before executing actions
      const balanceResultToPreserve = (window as any).__lastBalanceResult;
      const shouldPreserveBalance = balanceResultToPreserve && balanceResultToPreserve.type === 'balance';
      
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          await executeAction(action, response.intent, shouldPreserveBalance);
        }
        // Restore balance result if it was set (in case executeAction was called before we set preserveBalanceResult)
        if (shouldPreserveBalance) {
          console.log('💰 Restoring balance result after action execution:', balanceResultToPreserve);
          setActionResult(balanceResultToPreserve);
        }
      }

      // Play audio response if available
      if (response.audioResponseURL) {
        // Construct full URL to audio file
        const fullAudioUrl = response.audioResponseURL.startsWith('http') 
          ? response.audioResponseURL 
          : `${BACKEND_BASE_URL}${response.audioResponseURL}`;
        
        console.log('🔊 Audio URL:', fullAudioUrl);
        console.log('🔊 Backend Base URL:', BACKEND_BASE_URL);
        console.log('🔊 Response audioResponseURL:', response.audioResponseURL);
        
        setAudioResponseUrl(fullAudioUrl);
        
        // Wait for audio element to be ready
        if (audioRef.current) {
          // Clear previous source
          audioRef.current.src = '';
          
          // Set up event handlers before setting src
          audioRef.current.onloadstart = () => {
            console.log('🔊 Audio loading started');
          };
          audioRef.current.oncanplay = () => {
            console.log('🔊 Audio can play');
          };
          audioRef.current.onerror = (e) => {
            console.error('🔊 Audio error:', e);
            console.error('🔊 Failed to load:', fullAudioUrl);
            toast({
              title: "Audio Error",
              description: "Could not load audio. Check console for details.",
              variant: "destructive",
            });
          };
          audioRef.current.onplay = () => {
            console.log('🔊 Audio playing');
            setIsPlayingAudio(true);
          };
          audioRef.current.onended = () => {
            console.log('🔊 Audio ended');
            setIsPlayingAudio(false);
          };
          audioRef.current.onpause = () => {
            console.log('🔊 Audio paused');
            setIsPlayingAudio(false);
          };
          
          // Set source and try to play
          audioRef.current.src = fullAudioUrl;
          
          try {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              await playPromise;
              console.log('🔊 Audio playback started');
            }
          } catch (playError: any) {
            console.error('🔊 Error playing audio:', playError);
            console.error('🔊 Audio element state:', {
              src: audioRef.current.src,
              readyState: audioRef.current.readyState,
              networkState: audioRef.current.networkState,
              error: audioRef.current.error,
            });
            toast({
              title: "Audio Playback",
              description: "Click the play button to hear the response",
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error processing intent:', error);
      setAiResponse(`Sorry, I couldn't process that: ${error.message}`);
      toast({
        title: "Processing Error",
        description: error.message || "Failed to process your request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Card className="glass-strong p-6 rounded-2xl border-0 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Voice Assistant</h3>
          <p className="text-sm text-muted-foreground">Speak or type your command</p>
        </div>

        {/* Voice Recording */}
        <div className="flex justify-center">
          <Button
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`h-24 w-24 rounded-full ${isRecording ? 'animate-pulse-glow bg-destructive hover:bg-destructive' : 'bg-primary hover:bg-primary/90'}`}
          >
            {isProcessing ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-10 w-10" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </Button>
        </div>

        {/* Hidden audio element for playback */}
        <audio ref={audioRef} />

        {/* Waveform Visualization */}
        {isRecording && (
          <div className="flex items-center justify-center gap-1 h-16">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse-glow"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="glass p-4 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">You said:</p>
            <p className="font-medium">{transcript}</p>
          </div>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div className="glass p-4 rounded-xl border border-primary/20">
            <div className="flex items-start gap-2">
              <Volume2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">AI Response:</p>
                <p className="font-medium">{aiResponse}</p>
              </div>
            </div>
            
            {/* Audio Playback Controls */}
            {audioResponseUrl && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAudioPlayback}
                  className="flex items-center gap-2"
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Play Response
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Action Result */}
        {actionResult && (
          <div className="glass p-4 rounded-xl border border-success/20 bg-success/5">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Result:</p>
                {actionResult.type === 'balance' && actionResult.balance !== undefined ? (
                  <div>
                    <p className="font-semibold text-lg text-success mb-1">
                      ${actionResult.balance.toFixed(2)} USDC
                    </p>
                    <p className="text-sm text-muted-foreground">{actionResult.message}</p>
                  </div>
                ) : (
                  <p className="font-medium">{actionResult.message || actionResult.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Text Input Alternative */}
        <div className="flex gap-2">
          <Input
            placeholder="Or type your command..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
            className="glass flex-1 rounded-xl border-0"
          />
          <Button onClick={handleTextSubmit} size="icon" className="rounded-xl">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Command Examples */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Try saying:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "What's my balance?",
              "Deposit 100 EUR",
              "Transfer 50 USDC",
              "Create an invoice",
            ].map((cmd) => (
              <Button
                key={cmd}
                variant="outline"
                size="sm"
                onClick={() => {
                  setTextInput(cmd);
                  // Trigger submit after a brief delay to ensure state is set
                  setTimeout(() => {
                    handleTextSubmit();
                  }, 100);
                }}
                className="text-xs rounded-full"
              >
                {cmd}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VoiceInterface;


import React, { useState, useCallback, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { AnalysisResult, GenerationStatus, VideoMetadata } from './types';

// Components
const Header: React.FC = () => (
  <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <i className="fas fa-film text-white"></i>
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          RNS Studio
        </h1>
      </div>
      <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
        <span className="hidden md:inline">Advanced AI Video Processing</span>
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
      </div>
    </div>
  </header>
);

const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ["Upload Base", "Analyze & Target", "Generate"];
  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      {steps.map((step, idx) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep > idx ? 'bg-indigo-600' : currentStep === idx ? 'bg-indigo-500 border-2 border-indigo-300' : 'bg-slate-800'
            }`}>
              {currentStep > idx ? <i className="fas fa-check"></i> : idx + 1}
            </div>
            <span className={`text-sm ${currentStep === idx ? 'text-white font-semibold' : 'text-slate-500'}`}>{step}</span>
          </div>
          {idx < steps.length - 1 && <div className="w-12 h-px bg-slate-800"></div>}
        </React.Fragment>
      ))}
    </div>
  );
};

export default function App() {
  const [baseVideo, setBaseVideo] = useState<VideoMetadata | null>(null);
  const [targetCarImg, setTargetCarImg] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<GenerationStatus>({ stage: 'idle', message: '' });
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      const ok = await window.aistudio?.hasSelectedApiKey();
      setHasKey(!!ok);
    };
    checkKey();
  }, []);

  const handleKeySelect = async () => {
    try {
      // @ts-ignore
      await window.aistudio?.openSelectKey();
      setHasKey(true);
    } catch (e) {
      console.error("Failed to select key", e);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setBaseVideo({
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        base64
      });
      setStep(1);
    };
    reader.readAsDataURL(file);
  };

  const handleTargetCarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTargetCarImg(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    if (!baseVideo) return;
    setStatus({ stage: 'analyzing', message: 'Analyzing cinematic scene context...' });
    try {
      const result = await GeminiService.analyzeVideo(baseVideo.base64, baseVideo.type);
      setAnalysis(result);
      setStatus({ stage: 'configuring', message: 'Analysis complete.' });
    } catch (e) {
      setStatus({ stage: 'error', message: 'Analysis failed. Please try again.' });
    }
  };

  const triggerGeneration = async () => {
    if (!analysis || !hasKey) {
      if (!hasKey) handleKeySelect();
      return;
    }
    
    setStatus({ stage: 'generating', message: 'Initializing neural rendering engine...' });
    setStep(2);
    
    try {
      const finalPrompt = analysis.suggestedPrompt.replace('[TARGET_CAR]', 'the provided vehicle reference');
      const url = await GeminiService.generateSwappedVideo(
        finalPrompt, 
        undefined, 
        targetCarImg?.split(',')[1],
        (msg) => setStatus(prev => ({ ...prev, message: msg }))
      );
      setFinalVideoUrl(url);
      setStatus({ stage: 'completed', message: 'Processing finished!' });
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setStatus({ stage: 'error', message: 'Invalid API key state. Please re-verify account access.' });
      } else {
        setStatus({ stage: 'error', message: 'Generation failed: ' + e.message });
      }
    }
  };

  return (
    <div className="pb-20">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <StepIndicator currentStep={step} />

        {/* Step 0: Base Video Selection */}
        {step === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-indigo-900/30 rounded-full">
              <i className="fas fa-cloud-upload-alt text-3xl text-indigo-400"></i>
            </div>
            <h2 className="text-2xl font-bold mb-2">Upload Reference Video</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Choose the cinematic video containing the vehicle you want to replace.
            </p>
            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-semibold transition-all">
              Choose Video File
              <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} />
            </label>
          </div>
        )}

        {/* Step 1: Analysis & Target Setting */}
        {step === 1 && baseVideo && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                  <h3 className="font-semibold">Original Footage</h3>
                  <button onClick={() => setStep(0)} className="text-xs text-indigo-400 hover:text-indigo-300">Change</button>
                </div>
                <video src={baseVideo.url} className="w-full aspect-video bg-black" controls />
              </div>

              {!analysis ? (
                <button 
                  onClick={runAnalysis}
                  disabled={status.stage === 'analyzing'}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-bold transition-all flex items-center justify-center gap-3"
                >
                  {status.stage === 'analyzing' ? (
                    <><i className="fas fa-spinner animate-spin"></i> Analyzing...</>
                  ) : (
                    <><i className="fas fa-magic"></i> Analyze Scene Context</>
                  )}
                </button>
              ) : (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <i className="fas fa-microchip text-indigo-400"></i> Scene Insight
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-slate-500 block mb-1">Detected Car:</span>
                      <p className="text-slate-200">{analysis.originalCar}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Environment & Lighting:</span>
                      <p className="text-slate-200">{analysis.environment} • {analysis.lighting}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Target Prompt:</span>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 italic text-slate-400">
                        {analysis.suggestedPrompt.replace('[TARGET_CAR]', 'Your New Car')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center h-full flex flex-col justify-center">
                <h3 className="text-xl font-bold mb-4">Target Vehicle</h3>
                <p className="text-sm text-slate-400 mb-6">Upload an image of the car that should replace the original.</p>
                
                <div className="relative group mx-auto mb-8">
                  <div className={`w-48 h-48 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${targetCarImg ? 'border-indigo-500' : 'border-slate-700'}`}>
                    {targetCarImg ? (
                      <img src={targetCarImg} className="w-full h-full object-cover" />
                    ) : (
                      <i className="fas fa-car text-4xl text-slate-700"></i>
                    )}
                  </div>
                  <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-900/60 transition-all rounded-2xl">
                    <span className="text-xs font-bold uppercase tracking-widest bg-white text-black px-3 py-1 rounded">Choose Image</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleTargetCarUpload} />
                  </label>
                </div>

                {!hasKey ? (
                  <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4 mb-6">
                    <p className="text-sm text-amber-200 mb-3">Professional video processing requires a valid project API key.</p>
                    <button onClick={handleKeySelect} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                      Select Project Key
                    </button>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block mt-2 text-xs text-amber-400 underline">Billing Support</a>
                  </div>
                ) : (
                  <button 
                    onClick={triggerGeneration}
                    disabled={!analysis || !targetCarImg || status.stage === 'generating'}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-3"
                  >
                    <i className="fas fa-play"></i> Generate Swapped Video
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Generation Progress & Final Result */}
        {step === 2 && (
          <div className="max-w-3xl mx-auto">
            {status.stage !== 'completed' && status.stage !== 'error' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center animate-pulse">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-xl font-bold mb-2">Generating Cinematic Assets</h3>
                <p className="text-slate-400">{status.message}</p>
                <div className="mt-8 grid grid-cols-2 gap-4 text-xs text-slate-500 max-w-xs mx-auto text-left">
                  <div className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Frame Analysis</div>
                  <div className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Asset Synthesis</div>
                  <div className="flex items-center gap-2 text-indigo-400"><i className="fas fa-circle-notch animate-spin"></i> Motion Consistency</div>
                  <div className="flex items-center gap-2 opacity-50"><i className="fas fa-circle"></i> Final Rendering</div>
                </div>
              </div>
            ) : status.stage === 'error' ? (
              <div className="bg-red-900/20 border border-red-800 rounded-2xl p-12 text-center">
                <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-6"></i>
                <h3 className="text-xl font-bold mb-2">Process Interrupted</h3>
                <p className="text-red-200 mb-8">{status.message}</p>
                <button onClick={() => setStep(1)} className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-lg font-semibold">Try Again</button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl shadow-indigo-500/10">
                   <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg">Result: Cinematic Swap</h3>
                      <p className="text-xs text-slate-500">Rendered by RNS Studio</p>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={finalVideoUrl || '#'} 
                        download="swapped-cinematic.mp4"
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all"
                      >
                        <i className="fas fa-download"></i>
                      </a>
                    </div>
                  </div>
                  {finalVideoUrl && (
                    <video src={finalVideoUrl} className="w-full aspect-video" controls autoPlay loop />
                  )}
                </div>
                
                <div className="flex justify-center gap-4">
                  <button onClick={() => {
                    setBaseVideo(null);
                    setAnalysis(null);
                    setTargetCarImg(null);
                    setStep(0);
                    setStatus({ stage: 'idle', message: '' });
                  }} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all">
                    Start New Project
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

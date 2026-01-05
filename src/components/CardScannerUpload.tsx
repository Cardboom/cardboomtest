import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCardAnalysis, CardAnalysis, CardDetectionStatus } from '@/hooks/useCardAnalysis';
import { 
  Camera, 
  Upload, 
  X, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  ImageIcon,
  Target,
  Eye,
  Lightbulb,
  ChevronRight,
  HelpCircle,
  Edit3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CardScannerUploadProps {
  onScanComplete: (analysis: CardAnalysis, imageFile: File, previewUrl: string) => void;
  onSkip?: () => void;
  mode?: 'sell' | 'grading';
  className?: string;
}

interface ImageQualityCheck {
  passed: boolean;
  issues: string[];
  suggestions: string[];
}

export function CardScannerUpload({ 
  onScanComplete, 
  onSkip,
  mode = 'sell',
  className 
}: CardScannerUploadProps) {
  const { analysis, isAnalyzing, analyzeImage, clearAnalysis } = useCardAnalysis();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [qualityCheck, setQualityCheck] = useState<ImageQualityCheck | null>(null);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);
  const [scanStep, setScanStep] = useState<'upload' | 'quality' | 'analyzing' | 'results'>('upload');

  // Simulate image quality check (in production this would analyze the image)
  const checkImageQuality = useCallback(async (file: File): Promise<ImageQualityCheck> => {
    // Basic checks we can do client-side
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check file size (too small might indicate low quality)
    if (file.size < 50 * 1024) { // Less than 50KB
      issues.push('Image resolution may be too low');
      suggestions.push('Use a higher resolution image for accurate analysis');
    }

    // Check if image is too large (could cause processing issues)
    if (file.size > 15 * 1024 * 1024) {
      issues.push('Image file is very large');
      suggestions.push('Consider compressing the image for faster processing');
    }

    // For a more advanced check, we'd analyze the image data
    // For now, we'll assume images pass basic checks
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Check aspect ratio (cards are typically ~2.5:3.5)
        const aspectRatio = img.width / img.height;
        if (aspectRatio > 2 || aspectRatio < 0.3) {
          issues.push('Unusual aspect ratio detected');
          suggestions.push('Ensure the card is centered and fills most of the frame');
        }

        // Check resolution
        if (img.width < 400 || img.height < 400) {
          issues.push('Low resolution image');
          suggestions.push('Take a closer photo or use a higher resolution camera');
        }

        resolve({
          passed: issues.length === 0,
          issues,
          suggestions
        });
      };
      img.onerror = () => {
        resolve({
          passed: false,
          issues: ['Could not process image'],
          suggestions: ['Please try a different image file']
        });
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      return;
    }

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setScanStep('quality');
    setIsCheckingQuality(true);

    // Check image quality first
    const quality = await checkImageQuality(file);
    setQualityCheck(quality);
    setIsCheckingQuality(false);

    if (quality.passed) {
      // Proceed to analysis - pass the File (not blob URL) for base64 conversion
      setScanStep('analyzing');
      const result = await analyzeImage(file);
      
      if (result) {
        setScanStep('results');
      }
    }
  };

  const handleRetryWithNewImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setQualityCheck(null);
    clearAnalysis();
    setScanStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProceedAnyway = async () => {
    if (!imageFile) return;
    setScanStep('analyzing');
    const result = await analyzeImage(imageFile);
    if (result) {
      setScanStep('results');
    }
  };

  const handleConfirmScan = () => {
    if (analysis && imageFile && imagePreview) {
      onScanComplete(analysis, imageFile, imagePreview);
    }
  };

  return (
    <Card className={cn("border-primary/10 overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
      <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {mode === 'sell' ? 'AI Card Scanner' : 'AI Card Recognition'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {mode === 'sell' 
            ? 'Upload a card image to auto-fill listing details and get pricing suggestions'
            : 'Upload card photos for AI-powered grading analysis'
          }
        </p>
      </CardHeader>

      <CardContent className="p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageSelect}
        />

        <AnimatePresence mode="wait">
          {/* Upload Step */}
          {scanStep === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-64 border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex flex-col items-center justify-center gap-4 transition-all hover:bg-muted/30 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <span className="text-2xl text-muted-foreground">/</span>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Take photo or choose from gallery</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG, WebP • Max 15MB
                  </p>
                </div>
              </button>

              {/* Tips Section */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Tips for best results</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    Center the card and fill the frame
                  </li>
                  <li className="flex items-center gap-2">
                    <Eye className="w-3 h-3" />
                    Ensure good lighting without glare
                  </li>
                  <li className="flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" />
                    Use a plain background if possible
                  </li>
                </ul>
              </div>

              {onSkip && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-4"
                  onClick={onSkip}
                >
                  Skip and enter details manually
                </Button>
              )}
            </motion.div>
          )}

          {/* Quality Check Step */}
          {scanStep === 'quality' && (
            <motion.div
              key="quality"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="relative aspect-[3/4] max-w-[200px] mx-auto rounded-xl overflow-hidden border border-border">
                {imagePreview && (
                  <img 
                    src={imagePreview} 
                    alt="Card preview" 
                    className="w-full h-full object-cover"
                  />
                )}
                {isCheckingQuality && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Checking image quality...</span>
                  </div>
                )}
              </div>

              {qualityCheck && !isCheckingQuality && (
                <div className="space-y-4">
                  {qualityCheck.passed ? (
                    <div className="p-4 rounded-lg bg-gain/10 border border-gain/30 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-gain flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gain">Image quality looks good!</p>
                        <p className="text-sm text-muted-foreground">Proceeding to AI analysis...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                          <span className="font-medium text-amber-600 dark:text-amber-400">Image Quality Issues</span>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {qualityCheck.issues.map((issue, i) => (
                            <li key={i} className="text-muted-foreground">• {issue}</li>
                          ))}
                        </ul>
                        {qualityCheck.suggestions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-amber-500/20">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Suggestions:</p>
                            {qualityCheck.suggestions.map((suggestion, i) => (
                              <p key={i} className="text-xs text-muted-foreground">• {suggestion}</p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1" 
                          onClick={handleRetryWithNewImage}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Try Different Image
                        </Button>
                        <Button 
                          className="flex-1" 
                          onClick={handleProceedAnyway}
                        >
                          Proceed Anyway
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Analyzing Step */}
          {scanStep === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="relative aspect-[3/4] max-w-[200px] mx-auto rounded-xl overflow-hidden border border-border">
                {imagePreview && (
                  <img 
                    src={imagePreview} 
                    alt="Card preview" 
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                    <div className="absolute inset-0 animate-ping">
                      <Sparkles className="w-10 h-10 text-primary opacity-50" />
                    </div>
                  </div>
                  <span className="text-sm font-medium">AI Analyzing Card...</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Analyzing...</span>
                  <span className="text-primary">Processing</span>
                </div>
                <Progress value={65} className="h-2" />
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                <p className="text-xs text-muted-foreground">AI is performing:</p>
                <ul className="text-xs space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-gain" />
                    <span>OCR text extraction</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Card identification</span>
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-3 h-3 rounded-full border border-muted-foreground" />
                    <span>Market data lookup</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Results Step */}
          {scanStep === 'results' && analysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex gap-4">
                <div className="w-24 h-32 rounded-lg overflow-hidden border border-border flex-shrink-0">
                  {imagePreview && (
                    <img 
                      src={imagePreview} 
                      alt="Scanned card" 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  {/* DETECTED_CONFIRMED: High confidence match */}
                  {analysis.detectionStatus === 'detected_confirmed' && (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-gain" />
                        <span className="text-sm font-medium text-gain">Card identified</span>
                        <Badge variant="outline" className="ml-auto">
                          {Math.round(analysis.confidence * 100)}% match
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg leading-tight">
                        {analysis.cardName || 'Unknown Card'}
                      </h3>
                      {analysis.setName && (
                        <p className="text-sm text-muted-foreground">{analysis.setName}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {analysis.category && (
                          <Badge variant="secondary">{analysis.category.toUpperCase()}</Badge>
                        )}
                        {analysis.estimatedCondition && (
                          <Badge variant="outline">{analysis.estimatedCondition}</Badge>
                        )}
                        {analysis.cardNumber && (
                          <Badge variant="outline">#{analysis.cardNumber}</Badge>
                        )}
                      </div>
                    </>
                  )}

                  {/* DETECTED_NEEDS_CONFIRMATION: Card found but needs user input */}
                  {analysis.detectionStatus === 'detected_needs_confirmation' && (
                    <>
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-medium text-amber-500">Card detected — details need confirmation</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        We found a card, but couldn&apos;t confidently match it to the CardBoom Index.
                      </p>
                      
                      {/* Show extracted fields with confirmation badges */}
                      <div className="space-y-2 mt-3">
                        {analysis.cardName && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{analysis.cardName}</span>
                            {analysis.needsConfirmation.cardName && (
                              <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                                <Edit3 className="w-3 h-3 mr-1" />
                                Needs confirmation
                              </Badge>
                            )}
                          </div>
                        )}
                        {analysis.setName && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            {analysis.setName}
                            {analysis.needsConfirmation.setName && (
                              <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                                <Edit3 className="w-3 h-3 mr-1" />
                                Needs confirmation
                              </Badge>
                            )}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {analysis.category && (
                            <Badge variant="secondary" className={cn(
                              analysis.needsConfirmation.category && "border-amber-500/50"
                            )}>
                              {analysis.category.toUpperCase()}
                              {analysis.needsConfirmation.category && " ?"}
                            </Badge>
                          )}
                          {analysis.estimatedCondition && (
                            <Badge variant="outline">{analysis.estimatedCondition}</Badge>
                          )}
                          {analysis.cardNumber && (
                            <Badge variant="outline" className={cn(
                              analysis.needsConfirmation.cardNumber && "border-amber-500/50"
                            )}>
                              #{analysis.cardNumber}
                              {analysis.needsConfirmation.cardNumber && " ?"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* OCR extracted text hints */}
                      {analysis.ocrText.length > 0 && (
                        <div className="mt-2 p-2 rounded bg-muted/50 border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Detected text:</p>
                          <div className="flex flex-wrap gap-1">
                            {analysis.ocrText.slice(0, 6).map((text, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {text}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* NOT_DETECTED: No card-like object found */}
                  {analysis.detectionStatus === 'not_detected' && (
                    <div className="flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <span className="text-sm font-medium text-destructive">Card not detected</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Please upload a clear photo of the card. Make sure the card is centered and well-lit.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Info for Sell Mode - show for both confirmed and needs_confirmation */}
              {mode === 'sell' && analysis.pricing && analysis.detectionStatus !== 'not_detected' && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Pricing Intelligence
                    {analysis.detectionStatus === 'detected_needs_confirmation' && (
                      <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                        Estimated
                      </Badge>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-background/80">
                      <p className="text-xs text-muted-foreground">Quick Sell</p>
                      <p className="text-lg font-bold text-foreground">
                        ${analysis.pricing.quickSellPrice?.toFixed(2) || '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-background/80">
                      <p className="text-xs text-muted-foreground">Max Profit</p>
                      <p className="text-lg font-bold text-primary">
                        ${analysis.pricing.maxProfitPrice?.toFixed(2) || '—'}
                      </p>
                    </div>
                  </div>
                  {analysis.pricing.medianSold && (
                    <p className="text-xs text-muted-foreground">
                      Based on {analysis.pricing.salesCount} recent sales • 
                      Median: ${analysis.pricing.medianSold.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Visible Observations for Grading Mode - only show if confirmed */}
              {mode === 'grading' && analysis.detectionStatus === 'detected_confirmed' && analysis.ocrText.length > 0 && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <h4 className="text-sm font-medium mb-2">Detected Text</h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.ocrText.slice(0, 8).map((text, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {text}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons based on detection status */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={handleRetryWithNewImage}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Scan different card
                </Button>
                
                {/* For confirmed: simple "Use this card" */}
                {analysis.detectionStatus === 'detected_confirmed' && (
                  <Button 
                    className="flex-1" 
                    onClick={handleConfirmScan}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Use this card
                  </Button>
                )}

                {/* For needs confirmation: "Confirm card details" */}
                {analysis.detectionStatus === 'detected_needs_confirmation' && (
                  <Button 
                    className="flex-1" 
                    onClick={handleConfirmScan}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Confirm card details
                  </Button>
                )}

                {/* For not detected: only retry option, no confirm */}
                {analysis.detectionStatus === 'not_detected' && (
                  <Button 
                    variant="secondary"
                    className="flex-1" 
                    onClick={onSkip}
                  >
                    Enter details manually
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileSignature, Pen, Check, X, Smartphone, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface SignatureFieldProps {
    proposalId: number;
    onSigned?: (signatureData: SignatureData) => void;
    readonly?: boolean;
    existingSignature?: SignatureData | null;
}
interface SignatureData {
    signed: boolean;
    signedAt?: string;
    signerName?: string;
    signatureImage?: string;
}
export default function SignatureField({ proposalId, onSigned, readonly = false, existingSignature }: SignatureFieldProps) {
    const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
    const [signerName, setSignerName] = useState("");
    const [isDrawing, setIsDrawing] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { toast } = useToast();
    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        let x, y;
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        }
        else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
    };
    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        let x, y;
        if ('touches' in e) {
            e.preventDefault();
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        }
        else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        ctx.lineTo(x, y);
        ctx.stroke();
    };
    const stopDrawing = () => {
        setIsDrawing(false);
    };
    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas || !signerName.trim()) {
            toast({
                title: "Missing Information",
                description: "Please enter your name and draw your signature.",
                variant: "destructive",
            });
            return;
        }
        const signatureImage = canvas.toDataURL();
        const signatureData: SignatureData = {
            signed: true,
            signedAt: new Date().toISOString(),
            signerName: signerName.trim(),
            signatureImage
        };
        onSigned?.(signatureData);
        setIsSignDialogOpen(false);
        toast({
            title: "Proposal Signed",
            description: "Your signature has been recorded successfully.",
        });
    };
    if (existingSignature?.signed) {
        return (<Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Check className="w-5 h-5"/>
            Digitally Signed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Signed by: {existingSignature.signerName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {new Date(existingSignature.signedAt!).toLocaleString()}
                </p>
              </div>
              {existingSignature.signatureImage && (<div className="border rounded p-2 bg-white">
                  <img src={existingSignature.signatureImage} alt="Signature" className="h-12 w-auto"/>
                </div>)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2"/>
                Download Signed Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>);
    }
    if (readonly) {
        return (<Card className="border-gray-300 dark:border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-gray-600"/>
            Awaiting Signature
          </CardTitle>
          <CardDescription>
            This proposal requires your digital signature to proceed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Please review all sections above, then sign below to accept this proposal.
          </p>
        </CardContent>
      </Card>);
    }
    return (<Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-blue-600"/>
          Digital Signature
        </CardTitle>
        <CardDescription>
          Client signature required to finalize this proposal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            {isMobile ? (<>
                <Smartphone className="w-4 h-4"/>
                <span>Mobile-optimized signature capture</span>
              </>) : (<>
                <Pen className="w-4 h-4"/>
                <span>Click to add digital signature</span>
              </>)}
          </div>

          <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <FileSignature className="w-4 h-4 mr-2"/>
                Sign Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-2xl'}`}>
              <DialogHeader>
                <DialogTitle>Digital Signature</DialogTitle>
                <DialogDescription>
                  Please enter your name and draw your signature below
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="signerName">Full Name</Label>
                  <Input id="signerName" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Enter your full name"/>
                </div>

                <div>
                  <Label>Signature</Label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <canvas ref={canvasRef} width={isMobile ? 300 : 500} height={150} className="border border-gray-200 dark:border-gray-700 rounded bg-white cursor-crosshair w-full" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}/>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {isMobile ? 'Draw your signature with your finger' : 'Draw your signature with your mouse'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={clearSignature}>
                    <X className="w-4 h-4 mr-2"/>
                    Clear
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsSignDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveSignature} disabled={!signerName.trim()}>
                      <Check className="w-4 h-4 mr-2"/>
                      Sign Proposal
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <p><strong>Legal Notice:</strong> By signing this document, you agree to the terms and conditions outlined in this proposal. This digital signature has the same legal validity as a handwritten signature.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="text-xs text-gray-500 space-y-1">
            <p>✓ Secure e-signature technology</p>
            <p>✓ Legally binding digital signature</p>
            <p>✓ Timestamped and encrypted</p>
            {isMobile && <p>✓ Mobile-friendly interface</p>}
          </div>
        </div>
      </CardContent>
    </Card>);
}

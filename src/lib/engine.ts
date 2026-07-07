import { calculateAlphaMap } from './alphaMap';
import { removeWatermark, WatermarkPosition } from './blendModes';

export interface ProcessResult {
    blob: Blob;
    originalSrc: string;
    width: number;
    height: number;
}

export class WatermarkEngine {
    private bg48: HTMLImageElement;
    private bg96: HTMLImageElement;
    private alphaMaps: { [key: number]: Float32Array } = {};

    constructor(bg48: HTMLImageElement, bg96: HTMLImageElement) {
        this.bg48 = bg48;
        this.bg96 = bg96;
    }

    static async create(): Promise<WatermarkEngine> {
        const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });

        try {
            // Assets are now in /assets/ (served from public/)
            const [bg48, bg96] = await Promise.all([
                loadImage('/assets/bg_48.png'),
                loadImage('/assets/bg_96.png')
            ]);
            return new WatermarkEngine(bg48, bg96);
        } catch (e) {
            console.error("Failed to load assets.");
            throw e;
        }
    }

    getWatermarkInfo(width: number, height: number): WatermarkPosition {
        const isLarge = width > 1024 && height > 1024;
        const size = isLarge ? 96 : 48;
        const margin = isLarge ? 192 : 96;
        
        return {
            size,
            x: width - margin - size,
            y: height - margin - size,
            width: size, 
            height: size
        } as WatermarkPosition & { size: number };
    }

    async getAlphaMap(size: number): Promise<Float32Array> {
        if (this.alphaMaps[size]) return this.alphaMaps[size];
        
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        
        ctx.drawImage(size === 48 ? this.bg48 : this.bg96, 0, 0);
        
        const map = calculateAlphaMap(ctx.getImageData(0, 0, size, size));
        this.alphaMaps[size] = map;
        return map;
    }

    async process(imageFile: File): Promise<ProcessResult> {
        const objectUrl = URL.createObjectURL(imageFile);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i); 
            i.onerror = reject;
            i.src = objectUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const config = this.getWatermarkInfo(canvas.width, canvas.height);
        
        const alphaMap = await this.getAlphaMap((config as any).size);
        removeWatermark(imageData, alphaMap, config);
        
        ctx.putImageData(imageData, 0, 0);
        
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
        if (!blob) throw new Error("Failed to create blob");

        return {
            blob,
            originalSrc: objectUrl,
            width: img.width,
            height: img.height
        };
    }
}

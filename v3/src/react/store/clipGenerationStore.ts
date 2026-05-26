import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GeneratedClip {
    clipIndex: number
    success: boolean
    outputPath?: string
    error?: string
    startTime: string
    endTime: string
}

export interface ClipGenerationResult {
    success: boolean
    outputDir: string
    totalClips: number
    successfulClips: number
    failedClips: number
    results: GeneratedClip[]
}

interface ClipGenerationState {
    generatedClips: GeneratedClip[]
    outputDir: string
    isGenerating: boolean
    progress: {
        current: number
        total: number
        clipIndex: number
        status: string
        message: string
    } | null
    settings: {
        paddingSeconds: number
    }
    setGenerating: (isGenerating: boolean) => void
    setProgress: (progress: ClipGenerationState['progress']) => void
    setResult: (result: ClipGenerationResult) => void
    setSettings: (settings: Partial<ClipGenerationState['settings']>) => void
    clearClips: () => void
}

export const useClipGenerationStore = create<ClipGenerationState>()(
    persist(
        (set) => ({
            generatedClips: [],
            outputDir: '',
            isGenerating: false,
            progress: null,
            settings: {
                paddingSeconds: 0,
            },
            setGenerating: (isGenerating) => set({ isGenerating }),
            setProgress: (progress) => set({ progress }),
            setResult: (result) => set({
                generatedClips: result.results,
                outputDir: result.outputDir,
                isGenerating: false,
                progress: result.success ? {
                    current: result.totalClips,
                    total: result.totalClips,
                    clipIndex: result.totalClips - 1,
                    status: 'completed',
                    message: `Generated ${result.successfulClips} clips, ${result.failedClips} failed`
                } : null
            }),
            setSettings: (settings) => set((state) => ({
                settings: { ...state.settings, ...settings }
            })),
            clearClips: () => set({
                generatedClips: [],
                outputDir: '',
                progress: null
            }),
        }),
        {
            name: 'clipforge-clip-generation',
        }
    )
)

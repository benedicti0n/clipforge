interface Props {
    accurateCuts: boolean;
    setAccurateCuts: (b: boolean) => void;
}

export function ClipOptions({ accurateCuts, setAccurateCuts }: Props) {
    return (
        <div className="border rounded p-3 space-y-2">
            <h4 className="text-sm font-semibold">Clip Options</h4>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="accurateCuts"
                    checked={accurateCuts}
                    onChange={(e) => setAccurateCuts(e.target.checked)}
                />
                <label htmlFor="accurateCuts" className="text-sm">
                    Frame Accurate Cuts (slower, re-encode)
                </label>
            </div>
        </div>
    );
}

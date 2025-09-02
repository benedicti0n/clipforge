export function loadFontToCSS(fontName: string, source: File | string) {
    let fontUrl: string;

    if (typeof source === "string") {
        // file path from disk
        fontUrl = `file://${source}`;
    } else {
        // browser File
        fontUrl = URL.createObjectURL(source);
    }

    const fontFace = new FontFace(fontName, `url(${fontUrl})`);
    fontFace.load().then((loaded) => {
        (document as any).fonts.add(loaded);
    });
}

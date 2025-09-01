export function loadFontToCSS(name: string, file: File) {
    const url = URL.createObjectURL(file);

    const fontFace = new FontFace(name, `url(${url})`);
    document.fonts.add(fontFace);

    return url; // useful if you want to revoke later
}

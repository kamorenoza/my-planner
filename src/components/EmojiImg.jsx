const EMOJI_CDN =
  "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64";

// Renders an Apple-style emoji as an image when a code is available,
// otherwise falls back to the native system emoji glyph.
export function EmojiImg({ emoji, code, className }) {
  if (!code) {
    return <span className={className}>{emoji}</span>;
  }
  return (
    <img
      className={className}
      src={`${EMOJI_CDN}/${code}.png`}
      alt={emoji}
      loading="lazy"
      draggable={false}
    />
  );
}

export default EmojiImg;

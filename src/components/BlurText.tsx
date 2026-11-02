type BlurTextProps = {
  text: string;
  className?: string;
  delay?: number;
};

/**
 * A restrained adaptation of the official React Bits Blur Text pattern.
 * The complete phrase remains available to assistive technology as one label.
 */
export function BlurText({ text, className = '', delay = 0.08 }: BlurTextProps) {
  const words = text.split(' ');

  return (
    <span className={`blur-text ${className}`} role="text" aria-label={text}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <span
            className="blur-text__word"
            key={`${word}-${index}`}
            style={{ animationDelay: `${index * delay}s` }}
          >
            {word}{index < words.length - 1 ? '\u00a0' : ''}
          </span>
        ))}
      </span>
    </span>
  );
}

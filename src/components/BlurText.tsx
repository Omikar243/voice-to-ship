import { motion } from 'motion/react';

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
          <motion.span
            className="blur-text__word"
            key={`${word}-${index}`}
            initial={{ opacity: 0, filter: 'blur(7px)', y: 13 }}
            whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.78,
              delay: index * delay,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {word}{index < words.length - 1 ? '\u00a0' : ''}
          </motion.span>
        ))}
      </span>
    </span>
  );
}

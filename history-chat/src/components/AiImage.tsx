import { useState } from "react";
import styles from "./AiImage.module.css";

const HOST: string = import.meta.env.VITE_STABLE_DIFFUSION_HOST.replace(
  /\/$/,
  ""
);

export type AiImageProps = {
  prompt: string;
  size: number;
  className?: string;
};
export function AiImage({ prompt, size, className = "" }: AiImageProps) {
  const src = `${HOST}/gen-image?${new URLSearchParams({
    prompt,
  })}`;
  const [state, setState] = useState<{
    state: "loading" | "loaded" | "error";
    src: string;
  }>({ state: "loading", src: "loading" });
  return (
    <img
      className={`${styles.image} ${
        styles[state.src !== src ? "loading" : state.state]
      } ${className}`}
      width={size}
      height={size}
      src={src}
      alt={prompt}
      onLoad={() => setState({ state: "loaded", src })}
      onError={() => setState({ state: "error", src })}
    />
  );
}

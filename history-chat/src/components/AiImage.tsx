import { useState } from "react";

const HOST: string = import.meta.env.VITE_STABLE_DIFFUSION_HOST.replace(
  /\/^/,
  ""
);

export type AiImageProps = {
  prompt: string;
};
export function AiImage({ prompt }: AiImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      className={loaded ? "loaded" : ""}
      src={`${HOST}/gen-image?${new URLSearchParams({
        prompt,
      })}`}
      onLoad={() => setLoaded(true)}
    />
  );
}

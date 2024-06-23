import { Message } from "../lib/useCharacter";
import { AiImage } from "./AiImage";
import styles from "./MessageBubble.module.css";

export type ExtendedMessage =
  | Message
  | {
      role: "travel";
      side: "left" | "right";
      name: string;
      content: string;
    };

export type MessageBubbleProps = {
  message: ExtendedMessage;
};
export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className={`${styles.message} ${styles.user}`}>
        <div className={styles.blob}></div>
        <div className={styles.bubble}>
          <span className={styles.part}>{message.content}</span>
        </div>
      </div>
    );
  } else if (message.role === "travel") {
    return (
      <div
        className={`${styles.message} ${styles.travel} ${styles[message.side]}`}
      >
        <div className={styles.blob}></div>
        <div className={styles.bubble}>
          <span className={styles.name}>{message.name}</span>
          {message.content}
        </div>
      </div>
    );
  } else {
    return (
      <div
        className={`${styles.message} ${styles.assistant} ${
          message.done ? styles.done : ""
        }`}
      >
        <div className={styles.blob}></div>
        <div className={styles.bubble}>
          {message.content.map((part, i) => (
            <span className={styles.part} key={i}>
              {part}{" "}
            </span>
          ))}
        </div>
        {message.done ? (
          <AiImage
            className={styles.image}
            size={300}
            prompt={message.content.join(" ")}
          />
        ) : null}
      </div>
    );
  }
}

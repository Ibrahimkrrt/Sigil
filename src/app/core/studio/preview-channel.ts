import { Injectable } from '@angular/core';
import { PreviewDraft } from './preview-draft';

/**
 * The line between the Studio and its preview. The preview is the real page in a frame,
 * so it has a true viewport of the chosen device size; the draft reaches it over a
 * broadcast channel, which carries uploaded images without any size limit.
 */
@Injectable({ providedIn: 'root' })
export class PreviewChannel {
  private readonly channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('sigil-studio-preview') : null;

  /** Studio side: send the current draft. */
  publish(draft: PreviewDraft): void {
    this.channel?.postMessage({ kind: 'draft', draft });
  }

  /** Studio side: answer a preview that has just opened. Returns a function that stops answering. */
  onRequest(answer: () => void): () => void {
    return this.listen((message) => {
      if (message.kind === 'request') answer();
    });
  }

  /** Preview side: receive drafts, and ask for the current one. Returns a function that stops listening. */
  subscribe(receive: (draft: PreviewDraft) => void): () => void {
    const stop = this.listen((message) => {
      if (message.kind === 'draft' && message.draft) receive(message.draft);
    });
    this.channel?.postMessage({ kind: 'request' });
    return stop;
  }

  private listen(handle: (message: { kind?: string; draft?: PreviewDraft }) => void): () => void {
    const listener = (event: MessageEvent): void => handle(event.data ?? {});
    this.channel?.addEventListener('message', listener);
    return () => this.channel?.removeEventListener('message', listener);
  }
}

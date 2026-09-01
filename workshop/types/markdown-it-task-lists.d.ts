declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it';

  interface TaskListOptions {
    readonly enabled?: boolean;
    readonly label?: boolean;
    readonly labelAfter?: boolean;
  }

  function taskLists(markdown: MarkdownIt, options?: TaskListOptions): void;
  export default taskLists;
}

import MarkdownRenderer from '@/components/blog/MarkdownRenderer'

interface PostViewerProps {
  contentMarkdown: string
}

export default function PostViewer({ contentMarkdown }: PostViewerProps) {
  return <MarkdownRenderer content={contentMarkdown} />
}

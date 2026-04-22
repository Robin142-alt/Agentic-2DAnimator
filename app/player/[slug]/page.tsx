import PlayerBySlug from "@/app/player";

export default async function PlayerSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PlayerBySlug slug={slug} />;
}


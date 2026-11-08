import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CTAButton } from "@/components/CTA";
import { POSTS, getPost, formatDate, coverFor } from "@/lib/posts";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: "Insights | Solvant Labs" };
  return {
    title: `${post.title} | Solvant Labs`,
    description: post.dek,
    openGraph: { title: post.title, description: post.dek, type: "article" },
  };
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <article>
      <section className="paper-grid py-[clamp(50px,7vw,88px)] pb-[clamp(26px,4vw,38px)]">
        <div className="mx-auto max-w-[760px] px-6">
          <Link
            href="/insights"
            className="font-mono text-[12px] text-graphite before:content-['←_'] hover:text-signal"
          >
            Insights
          </Link>
          <h1 className="mt-5 text-[clamp(28px,4.8vw,46px)] font-bold leading-[1.08] tracking-[-0.02em]">
            {post.title}
          </h1>
          <p className="mt-4 text-[clamp(17px,1.8vw,20px)] text-graphite">{post.dek}</p>
          <div className="mt-5 font-mono text-[12px] uppercase tracking-[0.1em] text-graphite">
            {formatDate(post.date)} · {post.readMins} min read · {post.author}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[880px] px-6 pb-8">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[12px] border border-trace bg-paper shadow-[0_18px_50px_rgba(16,24,32,0.08)]">
          <Image
            src={coverFor(post.slug)}
            alt=""
            fill
            priority
            sizes="(max-width: 880px) 100vw, 880px"
            className="object-cover"
          />
        </div>
      </div>

      <section className="pb-[clamp(44px,6vw,80px)]">
        <div className="mx-auto max-w-[680px] px-6">
          {post.body.map((b, i) => {
            if (b.type === "h2") {
              return (
                <h2 key={i} className="mb-3 mt-9 text-[clamp(21px,2.6vw,26px)] leading-[1.2]">
                  {b.text}
                </h2>
              );
            }
            if (b.type === "ul") {
              return (
                <ul key={i} className="my-5 flex flex-col gap-2.5">
                  {b.items.map((it) => (
                    <li key={it} className="relative pl-6 text-[16.5px] leading-[1.6] text-graphite">
                      <span className="absolute left-0 top-[9px] h-2 w-2 rounded-full bg-signal" />
                      {it}
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="my-5 text-[clamp(16px,1.7vw,17.5px)] leading-[1.75] text-ink">
                {b.text}
              </p>
            );
          })}
        </div>
      </section>

      <section className="border-t border-trace py-[clamp(44px,6vw,72px)]">
        <div className="mx-auto max-w-[680px] px-6 text-center">
          <h2 className="mb-3 text-[clamp(21px,2.6vw,26px)]">Want this running in your business?</h2>
          <p className="mx-auto mb-7 max-w-[46ch] text-[16px] text-graphite">
            The intro call is 15 minutes. You&apos;ll leave with at least one automation idea you can use,
            whether or not we work together.
          </p>
          <CTAButton />
        </div>
      </section>
    </article>
  );
}

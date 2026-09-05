import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about/how-i-got-into-pm")({
  head: () =>
    pageHead(
      "/about/how-i-got-into-pm",
      "How I Got into Product Management | Ben Echols",
      "Ben Echols’s account of how he got into product management.",
    ),
  component: PM,
});

function PM() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-8">
      <h1 className="text-2xl font-bold pb-4">
        How I got into product management
      </h1>

      <p className="mb-4">I got really lucky, several times.</p>

      <p className="mb-4">
        My senior year of college, all I wanted to do was keep going to
        Williams. I wasn't excited about - or even really thinking about - a
        career. Now, when undergrads contact me asking what working in product
        is like, I'm happily amazed at how much more capable and mature they are
        than I ever was.
      </p>

      <p className="mb-4">
        I went to law school because the career counseling office didn't have
        much else to recommend to a philosophy major. When I got to law school,
        I missed my college friends, and I never got engaged with the material
        or new classmates.
      </p>

      <p className="mb-4">
        I dropped out of law school and went to work for Forrester Research,
        mostly because few college friends worked there, and Forrester would
        hire people fresh out of college who weren't sure what else to do. I
        learned about customer research, data analysis, writing, business
        processes, and the tech industry, without really intending to. This was
        extremely lucky!
      </p>

      <p className="mb-4">
        It was at Forrester where I learned about the role of product management
        and started thinking about pursuing it. I moved to an internal team
        doing a mix of training and internal product management for Forrester's
        research and consulting practices, just to get some semblance of
        relevant experience. I also moved to San Francisco while still working
        for Forrester. Most companies wouldn't have been so accommodating. This
        was extremely lucky!
      </p>

      <p className="mb-4">
        When I started looking in earnest for software product management jobs
        in SF, I talked to a family friend who was a technical recruiter. She
        delivered the tough news that I wasn't likely to find a PM role, because
        I didn't have a comp sci background or an MBA. She recommended I timebox
        my search and be ready with backup plans.
      </p>

      <p className="mb-4">
        A week later, I happened to have lunch with a high school friend
        visiting from out of town. Her boyfriend lived in SF, was a product
        manager at a company hiring entry level product managers, and he was
        willing to refer me. This was extremely lucky!
      </p>

      <p className="mb-4">
        My resume was pretty light, so I'd put my LSAT score on it. The hiring
        manager happened to be dating an attorney, so - unlike nearly everyone -
        he happened to know what a pretty good LSAT score was, and figured he'd
        give me an interview despite my lack of directly relevant experience or
        skills. This was extremely lucky!
      </p>

      <p className="mb-4">
        I did well enough in my interviews to get the job, and I've loved being
        a PM ever since.
      </p>
    </div>
  );
}

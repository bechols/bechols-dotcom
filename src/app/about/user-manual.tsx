import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about/user-manual")({
  head: () =>
    pageHead(
      "/about/user-manual",
      "Working with Ben Echols",
      "A guide to how Ben Echols likes to work and collaborate.",
    ),
  component: UserManual,
});

function UserManual() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-8">
      <h1 className="text-2xl font-bold pb-4">
        User manual for working with me
      </h1>

      <h2 className="text-xl font-bold mt-6 mb-3">How I think about the world:</h2>

      <ul className="list-disc mb-4 space-y-3">
        <li className="ml-8">
          <strong>We have to live with lots of uncertainty. We're never going to know as much as we want. Many questions don't have answers at all.</strong>
          <ul className="list-disc mt-2 space-y-2">
            <li className="ml-8">
              I was a philosophy major (yeah, yeah). I have been astounded at how relevant{" "}
              <a href="https://en.wikipedia.org/wiki/Epistemology" target="_blank" rel="noreferrer noopener" className="text-[#500082] hover:underline">
                epistemological thinking
              </a>{" "}
              has been in my career as a PM.
            </li>
            <li className="ml-8">
              It's hard to learn stuff. The more valuable an answer is, the harder it is for us to determine a definite answer with an experiment (usually). It's easy to suggest A/B tests in software products. They're great for some contexts, but we can't A/B test a strategy or core product bets. That doesn't mean we can't define feedback loops to assess them, but we shouldn't conflate those signals with a high level of certainty.
            </li>
            <li className="ml-8">
              Error ranges and confidence intervals are an underused concept. "How much sooner will team X finish project Y if we change Z?" is the type of question that often doesn't have a meaningful answer more precise than "Sooner...maybe." because the error bars are usually larger than any of the absolute values in play. I haven't yet worked in an organization or seen a tool that handles this well. Makes sense, because people don't like uncertainty.
            </li>
          </ul>
        </li>

        <li className="ml-8">
          <strong>We're never just creating or changing a product. We're also evolving the system that creates the product.</strong>
          <ul className="list-disc mt-2 space-y-2">
            <li className="ml-8">
              No one product change/feature is worth compromising the health of the system. We need to be able to take lots of shots. No one shot can win the game. That doesn't mean we don't do hard things, or make compromises, but those calls should always be made with the system in mind. Thinking about James Carse on infinite vs. finite games: let's play the infinite game.
            </li>
            <li className="ml-8">
              The people in the system should be fulfilled, incentivized on the actual desired outcomes, clear on what those outcomes are, etc. Smart people with the same incentives and the same information generally don't disagree on fundamentals - if we're stuck on something, step back to make sure we're in fact working from the same information toward the same goal(s).
            </li>
            <li className="ml-8">
              Problems are opportunities to update the system to gracefully handle or entirely prevent that category of problem.
            </li>
            <li className="ml-8">
              Gardening is generally a better analogy for building software products than physical engineering.
            </li>
          </ul>
        </li>

        <li className="ml-8">
          <strong>Don't assume that what we're doing is the best thing for us to be doing.</strong>
          <ul className="list-disc mt-2 space-y-2">
            <li className="ml-8">
              It's easier to assume that a given goal/mission/project is the best thing you could be doing. PMs need to periodically challenge this assumption at different levels - specific interfaces, entire features, product structures, even at the category and company level.
            </li>
            <li className="ml-8">
              Salience matters a lot. Errors often come from neglecting information someone knew but that we overlooked, not fundamentally unknowable gambles. Since humans prefer simplicity, it's a constant battle to keep all the relevant dimensions in everyone's minds when we're working on hard problems. When we forget key dimensions, we go in circles - endless meetings, people talking past one another, abortive decisions that are obviously unworkable when thinking about an overlooked aspect.
            </li>
          </ul>
        </li>

        <li className="ml-8">
          <strong>Even if we're doing the right thing, don't assume we need to do more of what we're doing.</strong>
          <ul className="list-disc mt-2 space-y-2">
            <li className="ml-8">
              <a href="http://mindingourway.com/half-assing-it-with-everything-youve-got/" target="_blank" rel="noreferrer noopener" className="text-[#500082] hover:underline">
                Half-ass it with everything you've got - target the right level of outcome(s) and invest appropriately vs. maximizing effort on any one dimension
              </a>
            </li>
          </ul>
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-3">My perfect workday includes:</h2>

      <ul className="list-disc mb-4 space-y-2">
        <li className="ml-8">Learning something surprising: from customers, coworkers, our systems, and/or the broader world.</li>
        <li className="ml-8">Thinking hard: writing about, diagramming, and/or analyzing data for a complex problem.</li>
        <li className="ml-8">Creating leverage: create a writeup or recommendation for a complex problem, get a hard decision right, refocus discussion on the highest impact dimensions, create a reusable resource, etc.</li>
        <li className="ml-8">Human interaction with smart people: face to face conversation with teammates.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-3">My preferred methods of communication:</h2>

      <ul className="list-disc mb-4 space-y-3">
        <li className="ml-8">
          If it's complicated:
          <ul className="list-disc mt-2 space-y-2">
            <li className="ml-8">If a writeup doesn't already exist: create the writeup and share with me async. I'll read it, comment, and we can discuss.</li>
            <li className="ml-8">If a writeup already exists and we're not making progress: let's discuss live.</li>
          </ul>
        </li>
        <li className="ml-8">
          If it's not complicated:
          <ul className="list-disc mt-2 space-y-2">
            <li className="ml-8">For questions/actions that are documented and/or have an established process: zero communication. Read the manual, follow the process, etc. If the docs or process don't work, tell me - I want to help fix them!</li>
            <li className="ml-8">
              For new questions: please ask in a shared forum if possible instead of a direct 1:1 communication.
              <ul className="list-disc mt-2 space-y-1">
                <li className="ml-8">Others likely have a similar question so it's valuable for them to see the discussion</li>
                <li className="ml-8">It gives others the chance to respond before I see it.</li>
                <li className="ml-8">I may not know the answer at all, or be missing info someone else has.</li>
                <li className="ml-8">Asking publicly sets us up to permanently document the answer somewhere (now it's at least in Slack search or equivalent) so future instances can be self served.</li>
              </ul>
            </li>
          </ul>
        </li>
        <li className="ml-8">In general: I'm good at staying on top of lots of sources of information (Slack channels, wiki pages, Jira tickets, pull requests, emails, etc) and responding quickly, so choice of channel isn't critical. Sometimes to the detriment of deeper work.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-3">Qualities I value in colleagues:</h2>

      <ul className="list-disc mb-4 space-y-3">
        <li className="ml-8">Accuracy in inputs and outputs. I appreciate when people take care to get details right.</li>
        <li className="ml-8">
          ROI/marginal return thinking, not focusing on absolutes or idealized situations.
          <ul className="list-disc mt-2 space-y-2">
            <li className="ml-8">Talking about what we'd do with unlimited resources is sometimes useful for brainstorming, but most of the time distracts from hard tradeoffs we need to make.</li>
          </ul>
        </li>
        <li className="ml-8">
          Systems thinking.
          <ul className="list-disc mt-2 space-y-2">
            <li className="ml-8">Keep track of all the moving parts. Don't focus on one goal or element to the detriment of the rest.</li>
          </ul>
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-3">What do people misunderstand about me?</h2>

      <ul className="list-disc mb-4">
        <li className="ml-8">I have a strong default instinct to say yes that I'm constantly fighting with as I say no to most requests.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-3">What stresses/frustrates me:</h2>

      <ul className="list-disc mb-4 space-y-3">
        <li className="ml-8">
          Punting important decisions.
          <ul className="list-disc mt-2 space-y-2">
            <li className="ml-8">If it's important to decide, decide it ASAP and make sure someone's owning the decision.</li>
            <li className="ml-8">If it's not important, that's ok. There will always be lots of stuff we don't know.</li>
          </ul>
        </li>
        <li className="ml-8">
          Coworkers ignoring resources.
          <ul className="list-disc mt-2 space-y-2">
            <li className="ml-8">Everyone's busy. I know it'd be easier if someone would just tell you the exact thing you want to know. But there are too many things to know! I try to create internal and customer facing docs to get some leverage. We're usually doing new and difficult things, and the answers often aren't simple, so having a complete response instead of a quick reply in chat is important for getting it right.</li>
            <li className="ml-8">Finding those resources and knowing whether they're up to date is often difficult - discovery is a hard problem! I'm happy to help point you in the right direction (or to fix errors/gaps, as is frequently necessary) but once you know where to look, please actually use those resources.</li>
          </ul>
        </li>
        <li className="ml-8">Duplicate communication across multiple channels. Please don't simultaneously ask me a question in two Slack channels and via email. Please don't simultaneously tag me in a PR and comment in a Jira ticket. I'm very good at staying on top of lots of sources of information (Slack channels, wiki pages, Jira tickets, pull requests, emails, etc) and responding quickly (sometimes to the detriment of deeper work).</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-3">How do others get the best out of me?</h2>

      <ul className="list-disc mb-4 space-y-2">
        <li className="ml-8">Clearly define the end result you want from me, along with any relevant constraints.</li>
        <li className="ml-8">Cut me off if I'm monologuing.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-3">How do I like to disagree?</h2>

      <ul className="list-disc mb-4 space-y-2">
        <li className="ml-8">Openly. If I realize we disagree on a fundamental or upstream issue, I want to focus on that, rather than the downstream issue we may have been discussing.</li>
        <li className="ml-8">I try to anticipate and address potential objections. Sometimes this means I don't state my basic position as clearly as I should.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-3">How do I ask for support?</h2>

      <ul className="list-disc mb-4">
        <li className="ml-8">Openly, but often after failing to make progress. I'll admit when I don't know how to move forward, or don't understand the ask.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-3">What motivates me?</h2>

      <ul className="list-disc mb-4 space-y-2">
        <li className="ml-8">Making an outsized impact. I like working on zero to one problems more than incremental improvements. I will always look for a way to eliminate a category of problem instead of fixing individual issues. Sometimes this is overkill.</li>
        <li className="ml-8">Understanding how complex systems work.</li>
        <li className="ml-8">Ownership. Having a meaningful stake in the value the team is creating and capturing is important to me. This is both financial and psychological. Sometimes this means I take things too personally.</li>
        <li className="ml-8">Being part of a team I like and respect.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-3">What are my outside interests?</h2>

      <ul className="list-disc mb-4 space-y-2">
        <li className="ml-8">
          <Link to="/books" className="text-[#500082] hover:underline">I read a lot</Link>.
        </li>
        <li className="ml-8">I sporadically play Go. I love the hugely complex scenarios generated by simple rules, and the freedom that comes from knowing there's very little chance I'll make the perfect move.</li>
        <li className="ml-8">I take okay care of some plants on the patio.</li>
        <li className="ml-8">I played ultimate in college. I haven't played much lately, but I still love throwing things, and I'm getting into disc golf.</li>
        <li className="ml-8">The California coast is my favorite place.</li>
      </ul>
    </div>
  );
}

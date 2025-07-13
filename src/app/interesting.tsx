import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import Markdown from "react-markdown";
import { createFileRoute } from "@tanstack/react-router";

const interesting = [
  {
    title: "52 Factorial",
    sourceName: "czep",
    sourceURL: "https://czep.net/weblog/52cards.html",
    text: `This number is beyond astronomically large. I say beyond astronomically large because most numbers that we already consider to be astronomically large are mere infinitesmal fractions of this number. So, just how large is it? Let's try to wrap our puny human brains around the magnitude of this number with a fun little theoretical exercise. Start a timer that will count down the number of seconds from 52! to 0. We're going to see how much fun we can have before the timer counts down all the way.

Start by picking your favorite spot on the equator. You're going to walk around the world along the equator, but take a very leisurely pace of one step every billion years. Make sure to pack a deck of playing cards, so you can get in a few trillion hands of solitaire between steps. After you complete your round the world trip, remove one drop of water from the Pacific Ocean. Now do the same thing again: walk around the world at one billion years per step, removing one drop of water from the Pacific Ocean each time you circle the globe. Continue until the ocean is empty. When it is, take one sheet of paper and place it flat on the ground. Now, fill the ocean back up and start the entire process all over again, adding a sheet of paper to the stack each time you've emptied the ocean.


Do this until the stack of paper reaches from the Earth to the Sun. Take a glance at the timer, you will see that the three left-most digits haven't even changed. You still have 8.063e67 more seconds to go. So, take the stack of papers down and do it all over again. One thousand times more. Unfortunately, that still won't do it. There are still more than 5.385e67 seconds remaining. You're just about a third of the way done.


To pass the remaining time, start shuffling your deck of cards. Every billion years deal yourself a 5-card poker hand. Each time you get a royal flush, buy yourself a lottery ticket. If that ticket wins the jackpot, throw a grain of sand into the Grand Canyon. Keep going and when you've filled up the canyon with sand, remove one ounce of rock from Mt. Everest. Now empty the canyon and start all over again. When you've levelled Mt. Everest, look at the timer, you still have 5.364e67 seconds remaining. You barely made a dent. If you were to repeat this 255 times, you would still be looking at 3.024e64 seconds. The timer would finally reach zero sometime during your 256th attempt.
`,
  },
  {
    title: "The Economics of Time Travel",
    sourceName: "Arjun Narayan",
    sourceURL:
      "https://www.theseedsofscience.pub/p/the-economics-of-time-travel",
    text: `The lack of time travellers visiting us may be seen as evidence that time travel is not possible. In this article, I argue an alternative explanation is that we are not economically important enough to our descendants to justify the costs of time travel. Using a cost-benefit analysis, I elaborate on this argument. I suggest that the major cost of time travel is likely to be the energy cost, whilst the largest benefit of time travel is knowledge which the present possesses, but the future has lost. Focusing on this benefit, I argue it is extremely unlikely that we possess a piece of knowledge which is sufficiently important to a future civilisation (system critical), but also has been lost by said civilisation. This is to say, we may not have been visited by time travellers because we are not important enough.`,
  },
  {
    title: "Grabby Aliens",
    sourceName: "Robin Hanson",
    sourceURL: "https://grabbyaliens.com/press-release",
    text: `Evolution is so slow that human-level intelligence will probably never evolve on most habitable planets. If so, advanced life should be more likely to appear on longer-lived planets, and toward the end of their habitable periods. Yet in a universe where most planets last for trillions of years, we humans have appeared in less than 1% of that time. Why are we so surprisingly early?

Some have tried to explain this by suggesting that long-lived planets are not long habitable. However, a new paper instead explains human earliness via a selection effect. "Grabby" aliens have long been out there, expanding fast and changing the appearance of their volumes. Within a few billion years they will "grab" all of the universe, and then suppress competitors. This sets a deadline; we could not have appeared much later than we did. Which is why we are early.`,
  },
  {
    title: "The Computational Universe and the Physical Universe",
    sourceName: "Arjun Narayan",
    sourceURL: "https://ristret.com/s/qk8wpt",
    text: `P!=NP is the biggest open question today, and not just because of the cliched joke that if P=NP, we'd solve the other 5 outstanding Clay Millenium Prize Problems. It's the biggest outstanding question because it has the chance to reveal very fundamental flaws in our entire scaffolding of theoretical understanding of our computational universe. Many different---and currently very plausible---advances to answering the P=NP question could very well be akin to the Michelson-Morley experiment, revealing gigantic flaws in our understanding of the computational universe, just as that experiment pretty much put the kibosh on luminiferous aether. Anyone who confidently asserts that P!=NP is dangerously close to Lord Kelvin's assertion in 1900 that "There is nothing new to be discovered in physics now. All that remains is more and more precise measurement."`,
  },
  {
    title: "The Surprising Creativity of Digital Evolution",
    sourceName: "arXiv",
    sourceURL: "https://arxiv.org/abs/1803.03453",
    text: `Biological evolution provides a creative fount of complex and subtle adaptations, often surprising the scientists who discover them. However, because evolution is an algorithmic process that transcends the substrate in which it occurs, evolution's creativity is not limited to nature. Indeed, many researchers in the field of digital evolution have observed their evolving algorithms and organisms subverting their intentions, exposing unrecognized bugs in their code, producing unexpected adaptations, or exhibiting outcomes uncannily convergent with ones in nature. Such stories routinely reveal creativity by evolution in these digital worlds, but they rarely fit into the standard scientific narrative. Instead they are often treated as mere obstacles to be overcome, rather than results that warrant study in their own right. The stories themselves are traded among researchers through oral tradition, but that mode of information transmission is inefficient and prone to error and outright loss. Moreover, the fact that these stories tend to be shared only among practitioners means that many natural scientists do not realize how interesting and lifelike digital organisms are and how natural their evolution can be. To our knowledge, no collection of such anecdotes has been published before. This paper is the crowd-sourced product of researchers in the fields of artificial life and evolutionary computation who have provided first-hand accounts of such cases. It thus serves as a written, fact-checked collection of scientifically important and even entertaining stories. In doing so we also present here substantial evidence that the existence and importance of evolutionary surprises extends beyond the natural world, and may indeed be a universal property of all complex evolving systems.`,
  },
  {
    title: "The Evolutionary Argument Against Reality",
    sourceName: "Donald Hoffman",
    sourceURL:
      "https://www.quantamagazine.org/the-evolutionary-argument-against-reality-20160421",
    text: `Suppose in reality there's a resource, like water, and you can quantify how much of it there is in an objective order — very little water, medium amount of water, a lot of water. Now suppose your fitness function is linear, so a little water gives you a little fitness, medium water gives you medium fitness, and lots of water gives you lots of fitness — in that case, the organism that sees the truth about the water in the world can win, but only because the fitness function happens to align with the true structure in reality. Generically, in the real world, that will never be the case. Something much more natural is a bell curve — say, too little water you die of thirst, but too much water you drown, and only somewhere in between is good for survival. Now the fitness function doesn't match the structure in the real world. And that's enough to send truth to extinction. For example, an organism tuned to fitness might see small and large quantities of some resource as, say, red, to indicate low fitness, whereas they might see intermediate quantities as green, to indicate high fitness. Its perceptions will be tuned to fitness, but not to truth. It won't see any distinction between small and large — it only sees red — even though such a distinction exists in reality.

But how can seeing a false reality be beneficial to an organism's survival?

There's a metaphor that's only been available to us in the past 30 or 40 years, and that's the desktop interface. Suppose there's a blue rectangular icon on the lower right corner of your computer's desktop — does that mean that the file itself is blue and rectangular and lives in the lower right corner of your computer? Of course not. But those are the only things that can be asserted about anything on the desktop — it has color, position and shape. Those are the only categories available to you, and yet none of them are true about the file itself or anything in the computer. They couldn't possibly be true. That's an interesting thing. You could not form a true description of the innards of the computer if your entire view of reality was confined to the desktop. And yet the desktop is useful. That blue rectangular icon guides my behavior, and it hides a complex reality that I don't need to know. That's the key idea. Evolution has shaped us with perceptions that allow us to survive. They guide adaptive behaviors. But part of that involves hiding from us the stuff we don't need to know. And that's pretty much all of reality, whatever reality might be. If you had to spend all that time figuring it out, the tiger would eat you.`,
  },
  {
    title: "Heads or Tails",
    sourceName: "Steven D. Levitt",
    sourceURL:
      "https://www.nber.org/system/files/working_papers/w22487/w22487.pdf",
    text: `Little is known about whether people make good choices when facing important decisions. This
paper reports on a large-scale randomized field experiment in which research subjects having
difficulty making a decision flipped a coin to help determine their choice. For important decisions
(e.g. quitting a job or ending a relationship), those who make a change (regardless of the outcome
of the coin toss) report being substantially happier two months and six months later. This
correlation, however, need not reflect a causal impact. To assess causality, I use the outcome of a
coin toss. Individuals who are told by the coin toss to make a change are much more likely to
make a change and are happier six months later than those who were told by the coin to maintain
the status quo. The results of this paper suggest that people may be excessively cautious when
facing life-changing choices.`,
  },
  {
    title: "I should have loved biology",
    sourceName: "James Somers",
    sourceURL: "http://jsomers.net/i-should-have-loved-biology/",
    text: `I should have loved biology but I found it to be a lifeless recitation of names: the Golgi apparatus and the Krebs cycle; mitosis, meiosis; DNA, RNA, mRNA, tRNA.

In the textbooks, astonishing facts were presented without astonishment. Someone probably told me that every cell in my body has the same DNA. But no one shook me by the shoulders, saying how crazy that was. I needed Lewis Thomas, who wrote in The Medusa and the Snail:

For the real amazement, if you wish to be amazed, is this process. You start out as a single cell derived from the coupling of a sperm and an egg; this divides in two, then four, then eight, and so on, and at a certain stage there emerges a single cell which has as all its progeny the human brain. The mere existence of such a cell should be one of the great astonishments of the earth. People ought to be walking around all day, all through their waking hours calling to each other in endless wonderment, talking of nothing except that cell.`,
  },
  {
    title: "Preface - A Dictionary of the English Language",
    sourceName: "Samuel Johnson",
    sourceURL: "https://johnsonsdictionaryonline.com/preface/",
    text: `I resolved to leave neither words nor things unexamined, and pleased myself with a prospect of the hours which I should revel away in feasts of literature, the obscure recesses of northern learning, which I should enter and ransack, the treasures with which I expected every search into those neglected mines to reward my labour, and the triumph with which I should display my acquisitions to mankind. When I had thus enquired into the original of words, I resolved to show likewise my attention to things; to pierce deep into every science, to enquire the nature of every substance of which I inserted the name, to limit every idea by a definition strictly logical, and exhibit every production of art or nature in an accurate description, that my book might be in place of all other dictionaries whether appellative or technical. But these were the dreams of a poet doomed at last to wake a lexicographer. I soon found that it is too late to look for instruments, when the work calls for execution, and that whatever abilities I had brought to my task, with those I must finally perform it. To deliberate whenever I doubted, to enquire whenever I was ignorant, would have protracted the undertaking without end, and, perhaps, without much improvement; for I did not find by my first experiments, that what I had not of my own was easily to be obtained: I saw that one enquiry only gave occasion to another, that book referred to book, that to search was not always to find, and to find was not always to be informed; and that thus to persue perfection, was, like the first inhabitants of Arcadia, to chance the sun, which, when they had reached the hill where he seemed to rest, was still beheld at the same distance from them.`,
  },
  {
    title: "Importance",
    sourceName: "Daniel Kahneman",
    sourceURL: "https://twitter.com/Kpaxs/status/1003757825271779333",
    text: `Nothing in life is quite as important as you think it is while you are thinking about it.`,
  },
  {
    title: "The Manhattan Project Fallacy",
    sourceName: "aelkus",
    sourceURL: "https://aelkus.github.io/",
    text: `Computers and bureaucracy go well together because bureaucratic organization itself might be considered a kind of technology. This is not just metaphorical. The sociologist Max Weber's bureaucratic ideal-type admits the following characteristics:

* Hierarchy of authority.
* Impersonality.
* Codified rules of conduct.
* Promotion based on achivement.
* Specialized division of labor.
* Efficiency.

At least several of these features might be considered computational in nature. Computational sciences often envision complex systems they model or engineer as hierarchal abstractions with specialized rules that allow the system to move from discrete state to discrete state. And both Weber and Herbert Simon suggested that complex social artifacts are also goal-oriented and designed so that their inner composition and organization of behavior is structured to accomplish certain goals given the demands of an external environment. Bureaucracies, lastly, are also assemblages of humans and machines working together to accomplish the aforementioned goals. Thus, technical rationality's problems do not stem solely from hubris. Technical rationality's flaws arise from the pathologies of "rationalization" and its dominance in social life. Weber suggests that an era dominated by rationalization processes will see the dominance of calculation as the motivation and cause of social action (to the detriment of everything else).
`,
  },
  {
    title: "Boundaries",
    sourceName: "Marshall McLuhan",
    sourceURL:
      "https://www.goodreads.com/quotes/677252-once-you-see-the-boundaries-of-your-environment-they-are",
    text: `Once you see the boundaries of your environment, they are no longer the boundaries of your environment.`,
  },
  {
    title: "Reality has a surprising amount of detail",
    sourceName: "John Salvatier",
    sourceURL:
      "http://johnsalvatier.org/blog/2017/reality-has-a-surprising-amount-of-detail",
    text: `Before you've noticed important details they are, of course, basically invisible. It's hard to put your attention on them because you don't even know what you're looking for. But after you see them they quickly become so integrated into your intuitive models of the world that they become essentially transparent. Do you remember the insights that were crucial in learning to ride a bike or drive? How about the details and insights you have that led you to be good at the things you're good at?

This means it's really easy to get stuck. Stuck in your current way of seeing and thinking about things. Frames are made out of the details that seem important to you. The important details you haven't noticed are invisible to you, and the details you have noticed seem completely obvious and you see right through them. This all makes makes it difficult to imagine how you could be missing something important.
`,
  },
  {
    title: "Thingifying the world",
    sourceName: "LDMCE",
    sourceURL:
      "https://ldmce.wordpress.com/2020/09/09/thingifying-the-world-ii/",
    text: `A sign in the University of Chicago Bookstore:

— 'Umbrellas are non-refundable.'

I can see why the Bookstore chose this phrasing.  It's not just shorter, it's more polite, less in-your-face than the alternatives:

— 'If you buy an umbrella here, you can't get a refund for it.'

— 'We won't refund your money for an umbrella bought here.'

If I were running the Bookstore, I'd probably use the same sign they did, and I don't mean to imply that the fate of humankind rests on the phrasing here.  I only want to use the sign as an example of what we do when we thingify the world.

I hope the umbrella example helps to show what I mean by 'thingify'.  The sign is dealing with what is *going on* in the world, but converts all that into a single characteristic of a thing.`,
  },
  {
    title: "Verschlimmbessern",
    sourceName: "Simon Kuestenmacher",
    sourceURL: "https://twitter.com/simongerman600/status/972432830717243392",
    text: `Verschlimmbessern: Making something worse while attempting to improve it.`,
  },
];

export const Route = createFileRoute("/interesting")({
  component: Interesting,
});

function Interesting() {
  return (
    <div className="max-w-prose">
      {interesting.map((entry) => {
        return (
          <a
            href={entry.sourceURL}
            target="_blank"
            rel="noreferrer noopener"
            key={entry.title}
          >
            <Card className="p-4 hover:bg-slate-200 mb-6">
              <CardTitle>{entry.title}</CardTitle>
              <CardDescription className="pt-2">
                {entry.sourceName}
              </CardDescription>
              <CardContent className="pt-2">
                <span className="text-sm list-disc prose">
                  <Markdown
                    components={{
                      p(props) {
                        return <p>{props.children}</p>;
                      },
                      ul(props) {
                        return <ul className="list-disc">{props.children}</ul>;
                      },
                      li(props) {
                        return <li className="ml-8">{props.children}</li>;
                      },
                    }}
                  >
                    {entry.text}
                  </Markdown>
                </span>
              </CardContent>
            </Card>
          </a>
        );
      })}
    </div>
  );
}

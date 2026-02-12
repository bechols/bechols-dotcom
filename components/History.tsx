import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

const currentWork = {
  position: "Director of Product, Temporal Cloud",
  company: "Temporal",
  link: "https://temporal.io",
  years: "2025 - Present",
};

const previousWork = [
  {
    position: "Head of Product",
    company: "Lamini",
    link: "https://lamini.ai",
    years: "2024 - 2024",
  },
  {
    position: "Co-founder and CEO",
    company: "Nemo",
    link: "https://www.youtube.com/watch?v=IEvZmzYIZQY",
    years: "2022 - 2024",
  },
  {
    position: "Director of Product Management, Confluent Cloud",
    company: "Confluent",
    link: "https://www.confluent.io",
    years: "2018 - 2022",
  },
  {
    position: "Director of Product Management, Data and Analytics",
    company: "HouseCanary",
    link: "https://www.housecanary.com",
    years: "2017 - 2018",
  },
  {
    position: "Senior Product Manager, Bitbucket Cloud",
    company: "Atlassian",
    link: "https://www.atlassian.com",
    years: "2016 - 2017",
  },
  {
    position: "Director of Product Management",
    company: "Originate",
    link: "https://www.originate.com",
    years: "2014 - 2016",
  },
  {
    position: "Product Manager",
    company: "Location Labs",
    link: "https://www.locationlabs.com",
    years: "2012 - 2014",
  },
  {
    position: "Research Training Consultant + Research Associate",
    company: "Forrester Research",
    link: "https://www.forrester.com",
    years: "2009 - 2012",
  },
  {
    position: "BA in Philosophy + Cognitive Science concentration",
    company: "Williams College",
    link: "https://www.williams.edu",
    years: "2003 - 2007",
  },
];

function TimelineEntry({
  position,
  company,
  link,
  years,
  isCurrent,
  isLast,
}: {
  position: string;
  company: string;
  link: string;
  years: string;
  isCurrent?: boolean;
  isLast?: boolean;
}) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex gap-4 sm:gap-6 relative"
    >
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center pt-1.5">
        <div
          className={`w-3 h-3 rounded-full shrink-0 ${
            isCurrent
              ? "bg-[#500082] ring-4 ring-[#500082]/20"
              : "bg-gray-300 group-hover:bg-gray-400"
          } transition-colors`}
        />
        {!isLast && <div className="w-px flex-1 bg-gray-200" />}
      </div>

      {/* Content */}
      <div className="pb-8 min-w-0">
        <p className="text-xs text-muted-foreground font-mono">{years}</p>
        <p
          className={`font-semibold mt-1 group-hover:underline ${
            isCurrent ? "text-lg" : "text-base"
          }`}
        >
          {position}
        </p>
        <p className="text-muted-foreground text-sm">{company}</p>
      </div>
    </a>
  );
}

function SubpageLink({
  to,
  title,
  description,
}: {
  to: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      from="/about"
      className="group flex items-center justify-between gap-4 rounded-lg border px-5 py-4 hover:bg-accent transition-colors"
    >
      <div className="min-w-0">
        <p className="font-semibold group-hover:underline">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

export default function History() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-8">
      {/* Intro */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">Ben Echols</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Product leader based in SF. I like understanding complex systems and scaling products for people who build stuff.
        </p>
      </div>

      {/* Sub-page links */}
      <div className="flex flex-col gap-3 mb-10">
        <SubpageLink
          to="/about/user-manual"
          title="User manual"
          description="How I like to work and communicate"
        />
        <SubpageLink
          to="/about/how-i-got-into-pm"
          title="How I got into PM"
          description="A story about getting lucky, several times"
        />
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">
          Experience
        </h2>
        <TimelineEntry {...currentWork} isCurrent />
        {previousWork.map((work, index) => (
          <TimelineEntry
            key={work.position}
            {...work}
            isLast={index === previousWork.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

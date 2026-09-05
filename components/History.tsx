import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus } from "lucide-react";

type TimelineRole = {
  position: string;
  dates?: string;
};

type TimelineCompany = {
  company: string;
  link: string;
  dates: string;
  scope?: string;
  roles: TimelineRole[];
};

const currentWork: TimelineCompany = {
  company: "Temporal",
  link: "https://temporal.io",
  dates: "Apr 2025–Present",
  roles: [{ position: "Director of Product, Temporal Cloud" }],
};

const previousWork: TimelineCompany[] = [
  {
    company: "Lamini",
    link: "https://lamini.ai",
    dates: "May–Dec 2025",
    roles: [{ position: "Head of Product" }],
  },
  {
    company: "Nemo",
    link: "https://www.youtube.com/watch?v=IEvZmzYIZQY",
    dates: "Oct 2022–May 2024",
    roles: [{ position: "Co-founder and CEO" }],
  },
  {
    company: "Confluent",
    link: "https://www.confluent.io",
    dates: "Aug 2018–Oct 2022",
    scope: "Confluent Cloud",
    roles: [
      { position: "Director of Product Management", dates: "Jul–Oct 2022" },
      { position: "Group Product Manager", dates: "Apr 2021–Jun 2022" },
      { position: "Senior Product Manager", dates: "Feb 2019–Apr 2021" },
      { position: "Product Manager", dates: "Aug 2018–Feb 2019" },
    ],
  },
  {
    company: "HouseCanary",
    link: "https://www.housecanary.com",
    dates: "Jun 2017–Aug 2018",
    scope: "Data and Analytics · Platform, APIs, and integrations",
    roles: [
      { position: "Director of Product Management", dates: "Jun–Aug 2018" },
      { position: "Senior Product Manager", dates: "Jun 2017–Jun 2018" },
    ],
  },
  {
    company: "Atlassian",
    link: "https://www.atlassian.com",
    dates: "Jan 2016–May 2017",
    roles: [{ position: "Senior Product Manager, Bitbucket Cloud" }],
  },
  {
    company: "Originate",
    link: "https://www.originate.com",
    dates: "Jun 2014–Jan 2016",
    roles: [
      { position: "Director of Product Management", dates: "Jun 2015–Jan 2016" },
      { position: "Product Manager", dates: "Jun 2014–Jun 2015" },
    ],
  },
  {
    company: "Location Labs",
    link: "https://www.locationlabs.com",
    dates: "Jun 2012–Jun 2014",
    roles: [{ position: "Product Manager" }],
  },
  {
    company: "Forrester Research",
    link: "https://www.forrester.com",
    dates: "Oct 2009–Mar 2012",
    roles: [
      { position: "Research Training Consultant", dates: "Jun 2010–Mar 2012" },
      { position: "Senior Research Associate", dates: "Oct 2009–Jun 2010" },
    ],
  },
  {
    company: "Williams College",
    link: "https://www.williams.edu",
    dates: "2003–2007",
    roles: [{ position: "BA in Philosophy + Cognitive Science concentration" }],
  },
];

function TimelineEntry({
  company,
  link,
  dates,
  scope,
  roles,
  isCurrent,
  isLast,
}: TimelineCompany & {
  isCurrent?: boolean;
  isLast?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();
  const [latestRole, ...earlierRoles] = roles;
  const hasEarlierRoles = earlierRoles.length > 0;

  return (
    <li className="flex gap-4 sm:gap-6 relative">
      <div aria-hidden="true" className="flex flex-col items-center pt-1.5">
        <div
          className={`w-3 h-3 rounded-full shrink-0 ${
            isCurrent
              ? "bg-[#500082] ring-4 ring-[#500082]/20"
              : "bg-gray-300"
          }`}
        />
        {!isLast && <div className="w-px flex-1 bg-gray-200" />}
      </div>

      <div className="pb-8 min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h3 className={`font-semibold ${isCurrent ? "text-lg" : "text-base"}`}>
            <a
              href={link}
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-gray-300 underline-offset-4 hover:decoration-current rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#500082]"
            >
              {company}
            </a>
          </h3>
          <p className="text-xs text-muted-foreground font-mono shrink-0">{dates}</p>
        </div>
        {hasEarlierRoles ? (
          <>
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={detailsId}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="group mt-2 flex w-full flex-col gap-1 rounded-sm text-left sm:flex-row sm:items-center sm:gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#500082]"
            >
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium group-hover:underline">
                  {latestRole.position}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium leading-none text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-foreground">
                  {isExpanded ? (
                    <Minus aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  <span>{roles.length} roles</span>
                </span>
              </span>
              {latestRole.dates && (
                <span className="shrink-0 text-xs font-mono text-muted-foreground sm:ml-auto">
                  {latestRole.dates}
                </span>
              )}
              <span className="sr-only"> roles at {company}</span>
            </button>
            <div id={detailsId} hidden={!isExpanded}>
              {scope && <p className="ml-6 mt-2 text-sm text-muted-foreground">{scope}</p>}
              <ol className="ml-6 mt-2 space-y-2">
                {earlierRoles.map((role) => (
                <li
                  key={role.position}
                  className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3"
                >
                  <p className="text-sm text-muted-foreground">{role.position}</p>
                  {role.dates && (
                    <p className="text-xs font-mono text-muted-foreground">{role.dates}</p>
                  )}
                </li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm font-medium">{latestRole.position}</p>
        )}
      </div>
    </li>
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
        <ol>
          <TimelineEntry {...currentWork} isCurrent />
          {previousWork.map((work, index) => (
            <TimelineEntry
              key={work.company}
              {...work}
              isLast={index === previousWork.length - 1}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}

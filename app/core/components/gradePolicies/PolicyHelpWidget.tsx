'use client';

import { useState } from 'react';
import { HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Section {
    title: string;
    content: string;
}

const SECTIONS: Section[] = [
    {
        title: "What is a grading policy?",
        content: "A grading policy defines how a student's final grade is computed from their assessment scores. It specifies which assessment types contribute to the grade and how much each one counts.",
    },
    {
        title: "Aggregation methods",
        content: "WEIGHTED: Each assessment type has a percentage weight (e.g. CAT 40% + MAIN_EXAM 60%). Weights must sum to 100.\n\nAVERAGE_PLUS_EXAM: Averages all CATs then combines with exam score.\n\nEXAM_ONLY: Final grade is based entirely on the main exam.\n\nDROP_LOWEST: Drops the lowest CAT score before averaging.\n\nPAPERS_AVERAGE: Averages scores across all paper types (PP1, PP2, etc).",
    },
    {
        title: "CBC / Rubric policies",
        content: "For CBC curricula, select WEIGHTED or a custom method and leave the grading scale empty to use rubric levels (EE/ME/AE/BE). Assign the policy directly to the CBC cohort or curriculum so it only applies there.",
    },
    {
        title: "Policy scope (who does it apply to?)",
        content: "Policies are resolved from most specific to least specific:\n1. Direct assignment to a cohort-subject (highest priority)\n2. Scoped to a cohort\n3. Scoped to a curriculum\n4. Default policy for the org (fallback)\n\nA CBC-specific policy assigned to the CBC curriculum will only affect CBC cohorts.",
    },
    {
        title: "Required components",
        content: "Mark assessment types as required. If a required type has no finalized scores, the grade is marked PROVISIONAL instead of FINAL. This prevents incomplete grades from appearing as final.",
    },
    {
        title: "Custom grading scale",
        content: "Define your own grade bands (e.g. 80–100 = A, 75–79 = A-). Leave empty to use the system default A/B/C/D/E. Each band needs a minimum score, a grade code, and optionally a label (e.g. 'Excellent').",
    },
    {
        title: "Frozen policies",
        content: "Once a policy is used in a finalized assessment, it becomes frozen and cannot be edited or deleted. This preserves historical accuracy. To change grading rules, create a new policy and assign it going forward.",
    },
];

export function PolicyHelpWidget() {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState<number | null>(0);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
            >
                <HelpCircle className="h-4 w-4" />
                How do policies work?
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-blue-600" />
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Grade Policy Guide
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Sections */}
                        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
                            {SECTIONS.map((section, i) => (
                                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                                    <button
                                        type="button"
                                        className="w-full flex items-center justify-between px-4 py-3
                                                   text-left text-sm font-medium text-gray-800
                                                   hover:bg-gray-50 transition-colors"
                                        onClick={() => setExpanded(expanded === i ? null : i)}
                                    >
                                        {section.title}
                                        {expanded === i
                                            ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                                            : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                                        }
                                    </button>
                                    {expanded === i && (
                                        <div className="px-4 pb-4 text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                                            {section.content}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Calendar, Clock, BookOpen,
  Search, X, Check, AlertCircle, Users,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { useSessions, useCohortSubjects } from '@/app/core/hooks/useSessions';
import { useTerms, useAcademicYears } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { topicAPI, topicSessionLinkAPI } from '@/app/core/api/topics';
import { Topic, Subtopic } from '@/app/core/types/topics';
import { useAuth } from '@/app/context/AuthContext';

// ── Error banner ──────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span className="flex-1 whitespace-pre-wrap">{message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Topic + Subtopic picker ───────────────────────────────────────────────

interface TopicSubtopicPickerProps {
  subjectId: number;
  onSelectionChange: (topic: Topic | null, subtopics: Subtopic[]) => void;
}

function TopicSubtopicPicker({ subjectId, onSelectionChange }: TopicSubtopicPickerProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubtopics, setSelectedSubtopics] = useState<Subtopic[]>([]);
  const [topicSearch, setTopicSearch] = useState('');
  const [subtopicSearch, setSubtopicSearch] = useState('');
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);

  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      setSelectedTopic(null);
      setSelectedSubtopics([]);
      return;
    }
    setLoadingTopics(true);
    topicAPI.getAll({ subject: subjectId })
      .then(data => {
        // API returns paginated { results: [] } or flat array
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.results)
            ? (data as any).results
            : [];
        setTopics(list);
      })
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false));
  }, [subjectId]);

  useEffect(() => {
    if (!selectedTopic) {
      setSubtopics([]);
      setSelectedSubtopics([]);
      return;
    }
    setLoadingSubtopics(true);
    topicAPI.getSubtopics(selectedTopic.id)
      .then(data => setSubtopics(Array.isArray(data) ? data : []))
      .catch(() => setSubtopics([]))
      .finally(() => setLoadingSubtopics(false));
  }, [selectedTopic]);

  useEffect(() => {
    onSelectionChange(selectedTopic, selectedSubtopics);
  }, [selectedTopic, selectedSubtopics]);

  const filteredTopics = useMemo(() => {
    if (!topicSearch.trim()) return topics;
    const q = topicSearch.toLowerCase();
    return topics.filter(
      t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [topics, topicSearch]);

  const filteredSubtopics = useMemo(() => {
    if (!subtopicSearch.trim()) return subtopics;
    const q = subtopicSearch.toLowerCase();
    return subtopics.filter(
      s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [subtopics, subtopicSearch]);

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setSelectedSubtopics([]);
    setTopicSearch('');
  };

  const handleTopicClear = () => {
    setSelectedTopic(null);
    setSelectedSubtopics([]);
    setSubtopics([]);
  };

  const toggleSubtopic = (subtopic: Subtopic) => {
    setSelectedSubtopics(prev =>
      prev.find(s => s.id === subtopic.id)
        ? prev.filter(s => s.id !== subtopic.id)
        : [...prev, subtopic]
    );
  };

  if (!subjectId) return null;

  return (
    <div className="space-y-4">
      {/* Topic selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Topic <span className="text-red-500">*</span>
        </label>

        {selectedTopic ? (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Badge variant="blue" size="md" className="font-mono shrink-0">
              {selectedTopic.code}
            </Badge>
            <span className="font-medium text-gray-900 flex-1">{selectedTopic.name}</span>
            <button
              type="button"
              onClick={handleTopicClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={topicSearch}
                onChange={e => setTopicSearch(e.target.value)}
                placeholder="Search topics..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {loadingTopics ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  Loading topics...
                </div>
              ) : filteredTopics.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  {topics.length === 0
                    ? 'No topics for this subject yet'
                    : 'No topics match your search'
                  }
                </div>
              ) : (
                filteredTopics.map(topic => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleTopicSelect(topic)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <Badge variant="blue" size="sm" className="font-mono shrink-0">
                      {topic.code}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{topic.name}</p>
                      {topic.description && (
                        <p className="text-xs text-gray-500 truncate">{topic.description}</p>
                      )}
                    </div>
                    <Badge variant="default" size="sm" className="shrink-0">
                      {topic.subtopics_count}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subtopic multi-select */}
      {selectedTopic && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subtopics to cover
            <span className="text-gray-400 font-normal ml-1">(select all that apply)</span>
          </label>

          {loadingSubtopics ? (
            <div className="py-4 text-center text-sm text-gray-500 border border-gray-200 rounded-lg">
              Loading subtopics...
            </div>
          ) : subtopics.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
              No subtopics for this topic yet
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {subtopics.length > 5 && (
                <div className="relative border-b border-gray-200">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={subtopicSearch}
                    onChange={e => setSubtopicSearch(e.target.value)}
                    placeholder="Search subtopics..."
                    className="w-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  />
                </div>
              )}

              <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                {filteredSubtopics.map(subtopic => {
                  const isSelected = selectedSubtopics.some(s => s.id === subtopic.id);
                  return (
                    <button
                      key={subtopic.id}
                      type="button"
                      onClick={() => toggleSubtopic(subtopic)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${isSelected ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                        }`}
                    >
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <Badge variant="purple" size="sm" className="font-mono shrink-0">
                        {subtopic.code}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{subtopic.name}</p>
                        {subtopic.description && (
                          <p className="text-xs text-gray-500 truncate">{subtopic.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedSubtopics.length > 0 && (
                <div className="px-4 py-2 bg-green-50 border-t border-green-100 flex items-center justify-between">
                  <span className="text-xs text-green-700 font-medium">
                    {selectedSubtopics.length} subtopic{selectedSubtopics.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubtopics([])}
                    className="text-xs text-green-600 hover:text-green-800"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function CreateSessionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createSession } = useSessions();
  const { academicYears } = useAcademicYears();

  // Only show current-year cohorts — instructors cannot create sessions
  // against past-year cohorts (backend enforces this too)
  const currentYear = useMemo(
    () => academicYears.find(y => y.is_current),
    [academicYears]
  );
  const { cohorts } = useCohorts(
    currentYear ? { academic_year: currentYear.id } : undefined
  );

  // Only show terms from the current academic year
  const { terms } = useTerms(currentYear?.id);

  // Auto-select the active term (today falls within it)
  const activeTerm = useMemo(() => {
    const today = new Date();
    return terms.find(t => {
      const start = new Date(t.start_date);
      const end = new Date(t.end_date);
      return today >= start && today <= end;
    });
  }, [terms]);

  const [selectedCohort, setSelectedCohort] = useState<number>(0);
  const { cohortSubjects } = useCohortSubjects(selectedCohort || null);
  const [selectedCohortSubjectId, setSelectedCohortSubjectId] = useState<number>(0);
  const selectedCohortSubject = cohortSubjects.find(
    cs => cs.id === selectedCohortSubjectId
  );
  const isCBC = selectedCohortSubject?.curriculum_type === 'CBE';
  const subjectId = selectedCohortSubject?.subject ?? 0;

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubtopics, setSelectedSubtopics] = useState<Subtopic[]>([]);

  const [formData, setFormData] = useState({
    cohort_subject: 0,
    term: null as number | null,
    session_type: 'LESSON',
    session_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '09:30',
    title: '',
    description: '',
    venue: '',
    auto_create_attendance: true,
  });

  // Auto-select active term when terms load
  useEffect(() => {
    if (activeTerm && !formData.term) {
      setFormData(prev => ({ ...prev, term: activeTerm.id }));
    }
  }, [activeTerm]);

  // Auto-fill title from topic + subtopic selection
  useEffect(() => {
    if (!selectedTopic) return;
    const autoTitle = selectedSubtopics.length > 0
      ? `${selectedTopic.name} — ${selectedSubtopics.map(s => s.name).join(', ')}`
      : selectedTopic.name;
    setFormData(prev => ({ ...prev, title: autoTitle }));
  }, [selectedTopic, selectedSubtopics]);

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sessionTypes = [
    { value: 'LESSON', label: 'Lesson' },
    { value: 'PRACTICAL', label: 'Practical' },
    { value: 'PROJECT', label: 'Project' },
    { value: 'EXAM', label: 'Exam' },
    { value: 'FIELD_TRIP', label: 'Field Trip' },
    { value: 'ASSEMBLY', label: 'Assembly' },
    { value: 'OTHER', label: 'Other' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedCohort) newErrors.cohort = 'Cohort is required';
    if (!formData.cohort_subject) newErrors.cohort_subject = 'Subject is required';
    if (!formData.session_date) newErrors.session_date = 'Date is required';
    if (!formData.start_time) newErrors.start_time = 'Start time is required';
    if (!formData.end_time) newErrors.end_time = 'End time is required';
    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      newErrors.end_time = 'End time must be after start time';
    }
    if (!isCBC && !selectedTopic) {
      newErrors.topic = 'Select a topic for this session';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setSubmitError(null);

    try {
      // created_by is derived from auth token on the backend — do not send it
      const newSession = await createSession({ ...formData, created_by: user?.id || 0 });
      if (!isCBC && selectedSubtopics.length > 0) {
        await Promise.all(
          selectedSubtopics.map(subtopic =>
            topicSessionLinkAPI.create({
              session: newSession.id,
              subtopic: subtopic.id,
            })
          )
        );
      }

      router.push(`/sessions/${newSession.id}`);
    } catch (err: any) {
      // Surface the exact API error — term guard and year guard messages
      // must reach the instructor, not be swallowed
      const detail = err?.response?.data?.detail ?? err?.message;
      setSubmitError(
        Array.isArray(detail) ? detail.join('\n') :
          typeof detail === 'string' ? detail :
            'Failed to create session. Please check your inputs and try again.'
      );
      // Scroll to top so error is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
    if (submitError) setSubmitError(null);
  };

  const handleCohortChange = (cohortId: number) => {
    setSelectedCohort(cohortId);
    setSelectedCohortSubjectId(0);
    handleChange('cohort_subject', 0);
    setSelectedTopic(null);
    setSelectedSubtopics([]);
  };

  const handleCohortSubjectChange = (cohortSubjectId: number) => {
    setSelectedCohortSubjectId(cohortSubjectId);
    handleChange('cohort_subject', cohortSubjectId);
    setSelectedTopic(null);
    setSelectedSubtopics([]);
    handleChange('title', '');
  };

  // ── No current year guard ─────────────────────────────────────────────

  if (academicYears.length > 0 && !currentYear) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/sessions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Sessions
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Session</h1>
        </div>
        <Card>
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
            <h3 className="text-base font-semibold text-gray-900">
              No active academic year
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Sessions can only be created within the current academic year.
              Ask your administrator to set the current academic year before
              scheduling sessions.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/sessions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Sessions
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">Create New Session</h1>
          <p className="text-gray-500 mt-1">
            {currentYear
              ? `Scheduling for ${currentYear.name}`
              : 'Schedule a new class session'
            }
          </p>
        </div>
      </div>

      {/* Submit error — shown at top so it's always visible */}
      {submitError && (
        <ErrorBanner message={submitError} onDismiss={() => setSubmitError(null)} />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cohort — current year only */}
              <div>
                <Select
                  label="Cohort"
                  value={selectedCohort.toString()}
                  onChange={e => handleCohortChange(Number(e.target.value))}
                  required
                  options={[
                    { value: '', label: 'Select Cohort' },
                    ...cohorts.map(c => ({
                      value: String(c.id),
                      label: `${c.name}`,
                    })),
                  ]}
                />
                {errors.cohort && (
                  <p className="mt-1 text-sm text-red-600">{errors.cohort}</p>
                )}
              </div>

              {/* Subject */}
              <div>
                <Select
                  label="Subject"
                  value={formData.cohort_subject.toString()}
                  onChange={e => handleCohortSubjectChange(Number(e.target.value))}
                  required
                  disabled={!selectedCohort}
                  options={[
                    {
                      value: '0',
                      label: selectedCohort
                        ? 'Select Subject'
                        : 'Select a cohort first',
                    },
                    ...cohortSubjects.map(cs => ({
                      value: String(cs.id),
                      label: `${cs.subject_code} — ${cs.subject_name}${cs.is_compulsory ? ' (Core)' : ''}`,
                    })),
                  ]}
                />
                {errors.cohort_subject && (
                  <p className="mt-1 text-sm text-red-600">{errors.cohort_subject}</p>
                )}
              </div>

              {/* Term — current year terms only, auto-selects active term */}
              <div>
                <Select
                  label="Term"
                  value={formData.term?.toString() || ''}
                  onChange={e =>
                    handleChange('term', e.target.value ? Number(e.target.value) : null)
                  }
                  options={[
                    { value: '', label: terms.length === 0 ? 'No terms configured' : 'Select Term' },
                    ...terms.map(t => {
                      const today = new Date();
                      const isActive =
                        today >= new Date(t.start_date) &&
                        today <= new Date(t.end_date);
                      return {
                        value: String(t.id),
                        label: isActive ? `${t.name} (Active)` : t.name,
                      };
                    }),
                  ]}
                />
                {terms.length > 0 && !formData.term && (
                  <p className="mt-1 text-xs text-amber-600">
                    No active term for today. Sessions outside term windows may be rejected.
                  </p>
                )}
              </div>

              {/* Session Type */}
              <div>
                <Select
                  label="Session Type"
                  value={formData.session_type}
                  onChange={e => handleChange('session_type', e.target.value)}
                  required
                  options={sessionTypes}
                />
              </div>

              {/* Session Date */}
              <div>
                <Input
                  label="Session Date"
                  type="date"
                  value={formData.session_date}
                  onChange={e => handleChange('session_date', e.target.value)}
                  required
                />
                {errors.session_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.session_date}</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Topic & Subtopic — non-CBC only */}
        {formData.cohort_subject > 0 && !isCBC && (
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">Topic & Subtopics</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                Select what you'll be teaching. Links this session to the curriculum
                and pre-fills the session title.
              </p>
              <TopicSubtopicPicker
                subjectId={subjectId}
                onSelectionChange={(topic, subtopics) => {
                  setSelectedTopic(topic);
                  setSelectedSubtopics(subtopics);
                  if (errors.topic) {
                    setErrors(prev => { const n = { ...prev }; delete n.topic; return n; });
                  }
                }}
              />
              {errors.topic && (
                <p className="mt-2 text-sm text-red-600">{errors.topic}</p>
              )}
            </div>
          </Card>
        )}

        {/* Session Details */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Session Details</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Input
                  label="Session Title"
                  type="text"
                  placeholder={
                    formData.cohort_subject && !isCBC
                      ? 'Auto-filled from topic selection above'
                      : 'e.g., Introduction to Algebra'
                  }
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                />
                {selectedTopic && (
                  <p className="mt-1 text-xs text-gray-400">
                    Auto-filled from topic selection — you can edit this.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => handleChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Session objectives or additional notes..."
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Time & Location */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Time & Location</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Input
                  label="Start Time"
                  type="time"
                  value={formData.start_time}
                  onChange={e => handleChange('start_time', e.target.value)}
                  required
                />
                {errors.start_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>
                )}
              </div>
              <div>
                <Input
                  label="End Time"
                  type="time"
                  value={formData.end_time}
                  onChange={e => handleChange('end_time', e.target.value)}
                  required
                />
                {errors.end_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>
                )}
              </div>
              <div>
                <Input
                  label="Venue"
                  type="text"
                  placeholder="e.g., Room 101, Lab 2"
                  value={formData.venue}
                  onChange={e => handleChange('venue', e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Attendance Settings */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
            </div>
            <label className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_create_attendance}
                onChange={e => handleChange('auto_create_attendance', e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-gray-900">Auto-create attendance records</p>
                <p className="text-sm text-gray-600 mt-1">
                  Creates attendance records for all enrolled students.
                  Records will be unmarked by default.
                </p>
              </div>
            </label>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/sessions">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving
              ? selectedSubtopics.length > 0
                ? 'Creating & linking subtopics...'
                : 'Creating...'
              : 'Create Session'
            }
          </Button>
        </div>
      </form>
    </div>
  );
}
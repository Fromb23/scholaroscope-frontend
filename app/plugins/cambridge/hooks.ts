// ============================================================================
// app/plugins/cambridge/hooks.ts
// ============================================================================

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assessmentAPI,
  browserAPI,
  catalogueAssessmentComponentAPI,
  catalogueContentAreaAPI,
  catalogueEntryOptionAPI,
  catalogueFrameworkAPI,
  catalogueObjectiveAPI,
  catalogueProgrammeAPI,
  catalogueStrandAPI,
  catalogueSubjectProfileAPI,
  catalogueSubstrandAPI,
  catalogueSyllabusAPI,
  installationAPI,
  inspectionFrameworkAPI,
  inspectionSyllabusAPI,
  programmeAPI,
  progressAPI,
  subjectAPI,
  unitAPI,
} from './api';
import { queryKeys } from './queryKeys';
import type {
  CambridgeCatalogueAssessmentComponent,
  CambridgeCatalogueAssessmentComponentCreatePayload,
  CambridgeCatalogueEntryOptionPayload,
  CambridgeCatalogueFramework,
  CambridgeCatalogueFrameworkCreatePayload,
  CambridgeCatalogueLearningObjective,
  CambridgeCatalogueLearningObjectiveCreatePayload,
  CambridgeCatalogueListFilter,
  CambridgeCatalogueProgramme,
  CambridgeCatalogueProgrammeCreatePayload,
  CambridgeCatalogueStrand,
  CambridgeCatalogueStrandCreatePayload,
  CambridgeCatalogueSubjectProfile,
  CambridgeCatalogueSubjectProfileCreatePayload,
  CambridgeCatalogueSubstrand,
  CambridgeCatalogueSubstrandCreatePayload,
  CambridgeCatalogueSyllabus,
  CambridgeCatalogueSyllabusCreatePayload,
  CambridgeCatalogueSyllabusContentArea,
  CambridgeCatalogueSyllabusContentAreaCreatePayload,
  CambridgeRenameSubjectPayload,
} from './types';

function invalidateInstallationSurface(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.installation.status });
  qc.invalidateQueries({ queryKey: queryKeys.programmes.list });
  qc.invalidateQueries({ queryKey: queryKeys.subjects.list });
  qc.invalidateQueries({ queryKey: queryKeys.browser.list });
  qc.invalidateQueries({ queryKey: queryKeys.progress.list });
}

export function useCambridgeInstallationStatus() {
  return useQuery({
    queryKey: queryKeys.installation.status,
    queryFn: () => installationAPI.getStatus(),
  });
}

export function useInstallCambridge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => installationAPI.install(),
    onSuccess: () => invalidateInstallationSurface(qc),
  });
}

export function useEnableCambridgeInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => installationAPI.enable(),
    onSuccess: () => invalidateInstallationSurface(qc),
  });
}

export function useDisableCambridgeInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => installationAPI.disable(),
    onSuccess: () => invalidateInstallationSurface(qc),
  });
}

export function useCambridgeProgrammes() {
  return useQuery({
    queryKey: queryKeys.programmes.list,
    queryFn: () => programmeAPI.list(),
  });
}

export function useEnableCambridgeProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => programmeAPI.enable(id),
    onSuccess: (updatedProgramme) => {
      qc.invalidateQueries({ queryKey: queryKeys.programmes.list });
      qc.invalidateQueries({ queryKey: queryKeys.programmes.detail(updatedProgramme.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useDisableCambridgeProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => programmeAPI.disable(id),
    onSuccess: (updatedProgramme) => {
      qc.invalidateQueries({ queryKey: queryKeys.programmes.list });
      qc.invalidateQueries({ queryKey: queryKeys.programmes.detail(updatedProgramme.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useCambridgeSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects.list,
    queryFn: () => subjectAPI.list(),
  });
}

export function useCambridgeSubject(id: number | null) {
  return useQuery({
    queryKey: queryKeys.subjects.detail(id ?? 0),
    queryFn: () => subjectAPI.getById(id as number),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useEnableCambridgeSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subjectAPI.enable(id),
    onSuccess: (updatedSubject) => {
      qc.invalidateQueries({ queryKey: queryKeys.subjects.list });
      qc.invalidateQueries({ queryKey: queryKeys.subjects.detail(updatedSubject.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useDisableCambridgeSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subjectAPI.disable(id),
    onSuccess: (_, subjectId) => {
      qc.invalidateQueries({ queryKey: queryKeys.subjects.list });
      qc.invalidateQueries({ queryKey: queryKeys.subjects.detail(subjectId) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useRenameCambridgeSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CambridgeRenameSubjectPayload }) =>
      subjectAPI.rename(id, payload),
    onSuccess: (updatedSubject) => {
      qc.invalidateQueries({ queryKey: queryKeys.subjects.list });
      qc.invalidateQueries({ queryKey: queryKeys.subjects.detail(updatedSubject.id) });
      qc.invalidateQueries({ queryKey: queryKeys.browser.list });
    },
  });
}

export function useCambridgeBrowserSubjects() {
  return useQuery({
    queryKey: queryKeys.browser.list,
    queryFn: () => browserAPI.listSubjects(),
  });
}

export function useCambridgeLearningUnits(normalizedSubjectId: number | null) {
  return useQuery({
    queryKey: queryKeys.units.list(normalizedSubjectId ?? 0),
    queryFn: () => unitAPI.list(normalizedSubjectId as number),
    enabled: typeof normalizedSubjectId === 'number' && normalizedSubjectId > 0,
  });
}

export function useCambridgeAssessmentUnits(normalizedSubjectId: number | null) {
  return useQuery({
    queryKey: queryKeys.assessment.list(normalizedSubjectId ?? 0),
    queryFn: () => assessmentAPI.list(normalizedSubjectId as number),
    enabled: typeof normalizedSubjectId === 'number' && normalizedSubjectId > 0,
  });
}

export function useCambridgeInspectionFrameworks() {
  return useQuery({
    queryKey: queryKeys.inspection.frameworks.list,
    queryFn: () => inspectionFrameworkAPI.list(),
  });
}

export function useCambridgeInspectionFramework(id: number | null) {
  return useQuery({
    queryKey: queryKeys.inspection.frameworks.detail(id ?? 0),
    queryFn: () => inspectionFrameworkAPI.getById(id as number),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useCambridgeInspectionSyllabuses() {
  return useQuery({
    queryKey: queryKeys.inspection.syllabuses.list,
    queryFn: () => inspectionSyllabusAPI.list(),
  });
}

export function useCambridgeInspectionSyllabus(id: number | null) {
  return useQuery({
    queryKey: queryKeys.inspection.syllabuses.detail(id ?? 0),
    queryFn: () => inspectionSyllabusAPI.getById(id as number),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useCambridgeProgressList() {
  return useQuery({
    queryKey: queryKeys.progress.list,
    queryFn: () => progressAPI.list(),
  });
}

export function useCambridgeProgressDetail(normalizedSubjectId: number | null) {
  return useQuery({
    queryKey: queryKeys.progress.detail(normalizedSubjectId ?? 0),
    queryFn: () => progressAPI.detail(normalizedSubjectId as number),
    enabled: typeof normalizedSubjectId === 'number' && normalizedSubjectId > 0,
  });
}

// ============================================================================
// Catalogue authoring hooks
// ============================================================================

export function useCatalogueProgrammes(filter?: CambridgeCatalogueListFilter) {
  return useQuery({
    queryKey: queryKeys.catalogue.programmes.list(filter),
    queryFn: () => catalogueProgrammeAPI.list(filter),
  });
}

export function useCatalogueProgramme(id: number | null) {
  return useQuery({
    queryKey: queryKeys.catalogue.programmes.detail(id ?? 0),
    queryFn: () => catalogueProgrammeAPI.getById(id as number),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useCreateCatalogueProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CambridgeCatalogueProgrammeCreatePayload) =>
      catalogueProgrammeAPI.create(payload),
    onSuccess: (createdProgramme) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.programmes.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.programmes.detail(createdProgramme.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useUpdateCatalogueProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<CambridgeCatalogueProgramme, 'id'>> }) =>
      catalogueProgrammeAPI.update(id, payload),
    onSuccess: (updatedProgramme) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.programmes.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.programmes.detail(updatedProgramme.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useDeleteCatalogueProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogueProgrammeAPI.remove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.programmes.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.programmes.detail(id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useCatalogueSubjectProfiles(filter?: CambridgeCatalogueListFilter) {
  return useQuery({
    queryKey: queryKeys.catalogue.subjectProfiles.list(filter),
    queryFn: () => catalogueSubjectProfileAPI.list(filter),
  });
}

export function useCatalogueSubjectProfile(id: number | null) {
  return useQuery({
    queryKey: queryKeys.catalogue.subjectProfiles.detail(id ?? 0),
    queryFn: () => catalogueSubjectProfileAPI.getById(id as number),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useCreateCatalogueSubjectProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CambridgeCatalogueSubjectProfileCreatePayload) =>
      catalogueSubjectProfileAPI.create(payload),
    onSuccess: (createdSubjectProfile) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.subjectProfiles.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.subjectProfiles.detail(createdSubjectProfile.id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.frameworks.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.syllabuses.all });
    },
  });
}

export function useUpdateCatalogueSubjectProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<CambridgeCatalogueSubjectProfile, 'id' | 'structure_mode'>> }) =>
      catalogueSubjectProfileAPI.update(id, payload),
    onSuccess: (updatedSubjectProfile) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.subjectProfiles.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.subjectProfiles.detail(updatedSubjectProfile.id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.frameworks.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.syllabuses.all });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useDeleteCatalogueSubjectProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogueSubjectProfileAPI.remove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.subjectProfiles.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.subjectProfiles.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.frameworks.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.syllabuses.all });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useCatalogueFrameworks(filter?: CambridgeCatalogueListFilter) {
  return useQuery({
    queryKey: queryKeys.catalogue.frameworks.list(filter),
    queryFn: () => catalogueFrameworkAPI.list(filter),
  });
}

export function useCatalogueFramework(id: number | null) {
  return useQuery({
    queryKey: queryKeys.catalogue.frameworks.detail(id ?? 0),
    queryFn: () => catalogueFrameworkAPI.getById(id as number),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useCreateCatalogueFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CambridgeCatalogueFrameworkCreatePayload) =>
      catalogueFrameworkAPI.create(payload),
    onSuccess: (createdFramework) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.frameworks.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.frameworks.detail(createdFramework.id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.strands.all });
    },
  });
}

export function useUpdateCatalogueFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<CambridgeCatalogueFramework, 'id' | 'is_current'>> }) =>
      catalogueFrameworkAPI.update(id, payload),
    onSuccess: (updatedFramework) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.frameworks.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.frameworks.detail(updatedFramework.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useDeleteCatalogueFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogueFrameworkAPI.remove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.frameworks.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.frameworks.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.strands.all });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useCatalogueStrands(filter?: CambridgeCatalogueListFilter) {
  return useQuery({
    queryKey: queryKeys.catalogue.strands.list(filter),
    queryFn: () => catalogueStrandAPI.list(filter),
  });
}

export function useCatalogueStrand(id: number | null) {
  return useQuery({
    queryKey: queryKeys.catalogue.strands.detail(id ?? 0),
    queryFn: () => catalogueStrandAPI.getById(id as number),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useCreateCatalogueStrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CambridgeCatalogueStrandCreatePayload) =>
      catalogueStrandAPI.create(payload),
    onSuccess: (createdStrand) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.strands.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.strands.detail(createdStrand.id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.substrands.all });
    },
  });
}

export function useUpdateCatalogueStrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<CambridgeCatalogueStrand, 'id'>> }) =>
      catalogueStrandAPI.update(id, payload),
    onSuccess: (updatedStrand) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.strands.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.strands.detail(updatedStrand.id) });
    },
  });
}

export function useDeleteCatalogueStrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogueStrandAPI.remove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.strands.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.strands.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.substrands.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.objectives.all });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useCatalogueSubstrands(filter?: CambridgeCatalogueListFilter) {
  return useQuery({
    queryKey: queryKeys.catalogue.substrands.list(filter),
    queryFn: () => catalogueSubstrandAPI.list(filter),
  });
}

export function useCreateCatalogueSubstrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CambridgeCatalogueSubstrandCreatePayload) =>
      catalogueSubstrandAPI.create(payload),
    onSuccess: (createdSubstrand) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.substrands.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.substrands.detail(createdSubstrand.id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.objectives.all });
    },
  });
}

export function useUpdateCatalogueSubstrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<CambridgeCatalogueSubstrand, 'id'>> }) =>
      catalogueSubstrandAPI.update(id, payload),
    onSuccess: (updatedSubstrand) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.substrands.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.substrands.detail(updatedSubstrand.id) });
    },
  });
}

export function useDeleteCatalogueSubstrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogueSubstrandAPI.remove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.substrands.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.substrands.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.objectives.all });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useCatalogueObjectives(filter?: CambridgeCatalogueListFilter) {
  return useQuery({
    queryKey: queryKeys.catalogue.objectives.list(filter),
    queryFn: () => catalogueObjectiveAPI.list(filter),
  });
}

export function useCreateCatalogueObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CambridgeCatalogueLearningObjectiveCreatePayload) =>
      catalogueObjectiveAPI.create(payload),
    onSuccess: (createdObjective) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.objectives.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.objectives.detail(createdObjective.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useUpdateCatalogueObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<CambridgeCatalogueLearningObjective, 'id'>> }) =>
      catalogueObjectiveAPI.update(id, payload),
    onSuccess: (updatedObjective) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.objectives.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.objectives.detail(updatedObjective.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useDeleteCatalogueObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogueObjectiveAPI.remove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.objectives.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.objectives.detail(id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useCatalogueSyllabuses(filter?: CambridgeCatalogueListFilter) {
  return useQuery({
    queryKey: queryKeys.catalogue.syllabuses.list(filter),
    queryFn: () => catalogueSyllabusAPI.list(filter),
  });
}

export function useCatalogueSyllabus(id: number | null) {
  return useQuery({
    queryKey: queryKeys.catalogue.syllabuses.detail(id ?? 0),
    queryFn: () => catalogueSyllabusAPI.getById(id as number),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useCreateCatalogueSyllabus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CambridgeCatalogueSyllabusCreatePayload) =>
      catalogueSyllabusAPI.create(payload),
    onSuccess: (createdSyllabus) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.syllabuses.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.syllabuses.detail(createdSyllabus.id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.contentAreas.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.assessmentComponents.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.all });
    },
  });
}

export function useUpdateCatalogueSyllabus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<CambridgeCatalogueSyllabus, 'id' | 'is_current'>> }) =>
      catalogueSyllabusAPI.update(id, payload),
    onSuccess: (updatedSyllabus) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.syllabuses.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.syllabuses.detail(updatedSyllabus.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useDeleteCatalogueSyllabus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogueSyllabusAPI.remove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.syllabuses.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.syllabuses.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.contentAreas.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.assessmentComponents.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.all });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useCatalogueContentAreas(filter?: CambridgeCatalogueListFilter) {
  return useQuery({
    queryKey: queryKeys.catalogue.contentAreas.list(filter),
    queryFn: () => catalogueContentAreaAPI.list(filter),
  });
}

export function useCreateCatalogueContentArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CambridgeCatalogueSyllabusContentAreaCreatePayload) =>
      catalogueContentAreaAPI.create(payload),
    onSuccess: (createdArea) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.contentAreas.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.contentAreas.detail(createdArea.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useUpdateCatalogueContentArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<CambridgeCatalogueSyllabusContentArea, 'id'>> }) =>
      catalogueContentAreaAPI.update(id, payload),
    onSuccess: (updatedArea) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.contentAreas.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.contentAreas.detail(updatedArea.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useDeleteCatalogueContentArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogueContentAreaAPI.remove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.contentAreas.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.contentAreas.detail(id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useCatalogueAssessmentComponents(filter?: CambridgeCatalogueListFilter) {
  return useQuery({
    queryKey: queryKeys.catalogue.assessmentComponents.list(filter),
    queryFn: () => catalogueAssessmentComponentAPI.list(filter),
  });
}

export function useCreateCatalogueAssessmentComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CambridgeCatalogueAssessmentComponentCreatePayload) =>
      catalogueAssessmentComponentAPI.create(payload),
    onSuccess: (createdComponent) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.assessmentComponents.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.assessmentComponents.detail(createdComponent.id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.all });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useUpdateCatalogueAssessmentComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<CambridgeCatalogueAssessmentComponent, 'id'>> }) =>
      catalogueAssessmentComponentAPI.update(id, payload),
    onSuccess: (updatedComponent) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.assessmentComponents.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.assessmentComponents.detail(updatedComponent.id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.all });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useDeleteCatalogueAssessmentComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogueAssessmentComponentAPI.remove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.assessmentComponents.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.assessmentComponents.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.all });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useCatalogueEntryOptions(filter?: CambridgeCatalogueListFilter) {
  return useQuery({
    queryKey: queryKeys.catalogue.entryOptions.list(filter),
    queryFn: () => catalogueEntryOptionAPI.list(filter),
  });
}

export function useCreateCatalogueEntryOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CambridgeCatalogueEntryOptionPayload) =>
      catalogueEntryOptionAPI.create(payload),
    onSuccess: (createdEntryOption) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.detail(createdEntryOption.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useUpdateCatalogueEntryOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CambridgeCatalogueEntryOptionPayload> }) =>
      catalogueEntryOptionAPI.update(id, payload),
    onSuccess: (updatedEntryOption) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.detail(updatedEntryOption.id) });
      invalidateInstallationSurface(qc);
    },
  });
}

export function useDeleteCatalogueEntryOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogueEntryOptionAPI.remove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.all });
      qc.invalidateQueries({ queryKey: queryKeys.catalogue.entryOptions.detail(id) });
      invalidateInstallationSurface(qc);
    },
  });
}

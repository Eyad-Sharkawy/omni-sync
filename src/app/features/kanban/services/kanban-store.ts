import {computed, Injectable, signal} from '@angular/core';
import {Board} from '../../../core/models/board';

@Injectable()
export class KanbanStore {
  private _boards= signal<Board[]>([
      {
        id: 'board-product-ops-q1-2026',
        name: 'Product Ops Board',
        columns: [
          {
            id: 'todo',
            header: 'To do',
            color: 'indigo',
            tasks: [
              {
                id: 'task-redesign-onboarding-flow',
                message: 'Redesign onboarding flow for new users',
                priority: 'high',
                metaTags: [
                  {id: 'task-redesign-onboarding-flow-ux', text: 'UX', color: 'indigo'},
                  {id: 'task-redesign-onboarding-flow-research', text: 'Research', color: 'cyan'}
                ],
                startDate: new Date('2026-01-29'),
                dueDate: new Date('2026-03-29')
              },
              {
                id: 'task-draft-launch-checklist',
                message: 'Draft product launch checklist for Q2 rollout',
                priority: 'medium',
                metaTags: [
                  {id: 'task-draft-launch-checklist-planning', text: 'Planning', color: 'amber'},
                  {id: 'task-draft-launch-checklist-marketing', text: 'Marketing', color: 'emerald'}
                ],
                startDate: new Date('2026-03-18'),
                dueDate: new Date('2026-03-25')
              },
              {
                id: 'task-organize-design-assets',
                message: 'Organize design assets into the new shared library',
                priority: 'low',
                metaTags: [
                  {id: 'task-organize-design-assets-design', text: 'Design', color: 'grape'},
                  {id: 'task-organize-design-assets-cleanup', text: 'Cleanup', color: 'cerulean'}
                ],
                startDate: new Date('2026-03-20'),
                dueDate: new Date('2026-03-27')
              },
              {
                id: 'task-finalize-billing-retry-flow',
                message: 'Finalize billing retry flow before release freeze',
                priority: 'high',
                metaTags: [
                  {id: 'task-finalize-billing-retry-flow-payments', text: 'Payments', color: 'tomato'},
                  {id: 'task-finalize-billing-retry-flow-critical', text: 'Critical', color: 'rose'}
                ],
                startDate: new Date('2026-03-17'),
                dueDate: new Date('2026-03-24')
              },
              {
                id: 'task-write-onboarding-faq',
                message: 'Write onboarding FAQ for enterprise customers',
                priority: 'medium',
                metaTags: [
                  {id: 'task-write-onboarding-faq-content', text: 'Content', color: 'sage'},
                  {id: 'task-write-onboarding-faq-docs', text: 'Docs', color: 'slate'}
                ],
                startDate: new Date('2026-03-21'),
                dueDate: new Date('2026-03-30')
              },
              {
                id: 'task-refine-empty-state-illustrations',
                message: 'Refine empty-state illustrations for dashboard widgets',
                priority: 'low',
                metaTags: [
                  {id: 'task-refine-empty-state-illustrations-visual', text: 'Visual', color: 'lavender'},
                  {id: 'task-refine-empty-state-illustrations-ui', text: 'UI', color: 'mint'}
                ],
                startDate: new Date('2026-03-22'),
                dueDate: new Date('2026-04-02')
              },
              {
                id: 'task-document-webhook-schema',
                message: 'Document webhook event schema for partner team',
                priority: 'medium',
                metaTags: [
                  {id: 'task-document-webhook-schema-api', text: 'API', color: 'sky'},
                  {id: 'task-document-webhook-schema-integration', text: 'Integration', color: 'stone'}
                ],
                startDate: new Date('2026-03-19'),
                dueDate: new Date('2026-03-28')
              },
              {
                id: 'task-coordinate-security-checklist',
                message: 'Coordinate security checklist for SSO rollout',
                priority: 'high',
                metaTags: [
                  {id: 'task-coordinate-security-checklist-security', text: 'Security', color: 'grape'},
                  {id: 'task-coordinate-security-checklist-platform', text: 'Platform', color: 'cerulean'}
                ],
                startDate: new Date('2026-03-18'),
                dueDate: new Date('2026-03-26')
              },
              {
                id: 'task-prepare-demo-scripts',
                message: 'Prepare demo scripts for customer advisory board',
                priority: 'low',
                metaTags: [
                  {id: 'task-prepare-demo-scripts-ops', text: 'Ops', color: 'coral'},
                  {id: 'task-prepare-demo-scripts-demo', text: 'Demo', color: 'zinc'}
                ],
                startDate: new Date('2026-03-25'),
                dueDate: new Date('2026-04-04')
              }
            ]
          },
          {
            id: 'in-progress',
            header: 'In progress',
            color: 'amber',
            tasks: [
              {
                id: 'task-build-analytics-filters',
                message: 'Build analytics dashboard filters for regional teams',
                priority: 'high',
                metaTags: [
                  {id: 'task-build-analytics-filters-frontend', text: 'Frontend', color: 'steel'},
                  {id: 'task-build-analytics-filters-data', text: 'Data', color: 'violet'}
                ],
                startDate: new Date('2026-03-10'),
                dueDate: new Date('2026-03-31')
              },
              {
                id: 'task-prepare-api-contract-notes',
                message: 'Prepare API contract notes for mobile sync endpoint',
                priority: 'medium',
                metaTags: [
                  {id: 'task-prepare-api-contract-notes-backend', text: 'Backend', color: 'cyan'},
                  {id: 'task-prepare-api-contract-notes-docs', text: 'Docs', color: 'indigo'}
                ],
                startDate: new Date('2026-03-14'),
                dueDate: new Date('2026-03-22')
              }
            ]
          },
          {
            id: 'in-review',
            header: 'In Review',
            color: 'sky',
            tasks: [
              {
                id: 'task-verify-a11y-labels',
                message: 'Verify accessibility labels on settings modal',
                priority: 'low',
                metaTags: [
                  {id: 'task-verify-a11y-labels-qa', text: 'QA', color: 'teal'},
                  {id: 'task-verify-a11y-labels-a11y', text: 'A11y', color: 'lime'}
                ],
                startDate: new Date('2026-03-16'),
                dueDate: new Date('2026-03-19')
              }
            ]
          },
          {
            id: 'done',
            header: 'Done',
            color: 'mint',
            tasks: [
              {
                id: 'task-migrate-team-docs',
                message: 'Migrate team docs into the new knowledge base',
                priority: 'medium',
                metaTags: [
                  {id: 'task-migrate-team-docs-knowledge', text: 'Knowledge', color: 'slate'},
                  {id: 'task-migrate-team-docs-internal', text: 'Internal', color: 'mint'}
                ],
                startDate: new Date('2026-03-02'),
                dueDate: new Date('2026-03-09')
              },
              {
                id: 'task-ship-audit-log-export',
                message: 'Ship audit log export for admin console',
                priority: 'high',
                metaTags: [
                  {id: 'task-ship-audit-log-export-backend', text: 'Backend', color: 'emerald'},
                  {id: 'task-ship-audit-log-export-compliance', text: 'Compliance', color: 'steel'}
                ],
                startDate: new Date('2026-02-28'),
                dueDate: new Date('2026-03-12')
              },
              {
                id: 'task-cleanup-feature-flags',
                message: 'Clean up stale feature flags from staging',
                priority: 'low',
                metaTags: [
                  {id: 'task-cleanup-feature-flags-devops', text: 'DevOps', color: 'sage'},
                  {id: 'task-cleanup-feature-flags-maintenance', text: 'Maintenance', color: 'stone'}
                ],
                startDate: new Date('2026-03-05'),
                dueDate: new Date('2026-03-11')
              },
              {
                id: 'task-publish-release-notes',
                message: 'Publish release notes for spring milestone',
                priority: 'medium',
                metaTags: [
                  {id: 'task-publish-release-notes-product', text: 'Product', color: 'indigo'},
                  {id: 'task-publish-release-notes-release', text: 'Release', color: 'cyan'}
                ],
                startDate: new Date('2026-03-01'),
                dueDate: new Date('2026-03-08')
              },
              {
                id: 'task-resolve-payment-timeout',
                message: 'Resolve payment timeout bug on checkout flow',
                priority: 'high',
                metaTags: [
                  {id: 'task-resolve-payment-timeout-bugfix', text: 'Bugfix', color: 'tomato'},
                  {id: 'task-resolve-payment-timeout-hotfix', text: 'Hotfix', color: 'amber'}
                ],
                startDate: new Date('2026-02-26'),
                dueDate: new Date('2026-03-06')
              },
              {
                id: 'task-update-sidebar-icons',
                message: 'Update icon set for sidebar navigation',
                priority: 'low',
                metaTags: [
                  {id: 'task-update-sidebar-icons-ui', text: 'UI', color: 'violet'},
                  {id: 'task-update-sidebar-icons-polish', text: 'Polish', color: 'lavender'}
                ],
                startDate: new Date('2026-03-04'),
                dueDate: new Date('2026-03-10')
              }
            ]
          }
        ],
        startDate: new Date("2025-02-5"),
        dueDate: new Date("2026-4-1")
      }
    ]);
  readonly boards = this._boards.asReadonly();
  currentBoard = computed(() => this.boards()[0]);
}

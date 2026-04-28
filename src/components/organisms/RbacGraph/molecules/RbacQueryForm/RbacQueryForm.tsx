/* eslint-disable max-lines-per-function */
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AppstoreOutlined,
  ClearOutlined,
  ControlOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Alert, Button, Checkbox, Collapse, Input, InputNumber, Select, theme } from 'antd'
import type { CollapseProps } from 'antd'
import type { TRbacQueryPayload, TRbacReverseQueryPayload, TRbacSubjectKind } from 'localTypes/rbacGraph'
import { DEFAULT_SPEC } from './constants'
import {
  updateSpec,
  getPrimarySelectorCount,
  getScopeIdentityCount,
  getRuntimeLimitsCount,
  getSubjectCount,
  type TRbacQueryFormPayload,
} from './utils'
import { Styled } from './styled'

type TSectionLabelOptions = {
  colorPrimary: string
  colorFillSecondary: string
  borderRadiusLG: number
}

type TSectionLabelProps = {
  icon: ReactNode
  title: string
  activeCount: number
  panelKey: string
  isExpanded: boolean
  onToggle: (key: string) => void
}

const createSectionLabel = (
  { icon, title, activeCount, panelKey, isExpanded, onToggle }: TSectionLabelProps,
  { colorPrimary, colorFillSecondary, borderRadiusLG }: TSectionLabelOptions,
) => (
  <Styled.SectionLabel>
    <Styled.SectionLabelTrigger type="button" onClick={() => onToggle(panelKey)} aria-expanded={isExpanded}>
      <Styled.SectionLabelMain>
        <Styled.SectionIcon $color={colorPrimary}>{icon}</Styled.SectionIcon>
        <span>{title}</span>
      </Styled.SectionLabelMain>
    </Styled.SectionLabelTrigger>
    <Styled.ActiveBadge
      $background={colorFillSecondary}
      $borderRadiusLG={borderRadiusLG}
      $color={colorPrimary}
      $visible={activeCount > 0}
    >
      {activeCount > 0 ? `${activeCount} active` : '0 active'}
    </Styled.ActiveBadge>
  </Styled.SectionLabel>
)

type TSelectorOption = {
  label: string
  value: string
}

type TSelectorPatch = Partial<{
  apiGroups: string[]
  resources: string[]
  verbs: string[]
  resourceNames: string[]
  nonResourceURLs: string[]
}>

type TSelectorKey = keyof TSelectorPatch

type TRbacQueryFormProps<TPayload extends TRbacQueryFormPayload> = {
  value: TPayload
  queryMode?: 'role' | 'subject'
  selectorLoading: boolean
  selectorOptions: {
    apiGroups: TSelectorOption[]
    resources: TSelectorOption[]
    verbs: TSelectorOption[]
    nonResourceURLs: TSelectorOption[]
  }
  onSelectorChange: (patch: TSelectorPatch, changedKey: TSelectorKey) => void
  onChange: (payload: TPayload) => void
  onSubmit: () => void
  onReset: () => void
  loading: boolean
  collapseSignal?: number
  showRuntimeLimits?: boolean
}

export const RbacQueryForm = <TPayload extends TRbacQueryFormPayload>({
  value,
  queryMode = 'role',
  selectorLoading,
  selectorOptions,
  onSelectorChange,
  onChange,
  onSubmit,
  onReset,
  loading,
  collapseSignal = 0,
  showRuntimeLimits = true,
}: TRbacQueryFormProps<TPayload>) => {
  const { token } = theme.useToken()
  const { spec } = value
  const { selector } = spec
  const isReverseMode = queryMode === 'subject'
  const reverseSpec = isReverseMode ? (spec as TRbacReverseQueryPayload['spec']) : null
  const roleSpec = !isReverseMode ? (spec as TRbacQueryPayload['spec']) : null
  const defaultActiveSectionKeys = useMemo(() => {
    if (isReverseMode) return ['subject', 'primary-selectors', 'scope-identity']
    if (showRuntimeLimits) return ['primary-selectors', 'scope-identity', 'runtime-limits']
    return ['primary-selectors', 'scope-identity']
  }, [isReverseMode, showRuntimeLimits])
  const [activeSectionKeys, setActiveSectionKeys] = useState<string[]>(defaultActiveSectionKeys)
  const [showSubjectValidation, setShowSubjectValidation] = useState(false)

  const normalizeActiveKeys = useCallback((keys: string | string[]) => (Array.isArray(keys) ? keys : [keys]), [])

  const toggleSection = useCallback((sectionKey: string) => {
    setActiveSectionKeys(prev =>
      prev.includes(sectionKey) ? prev.filter(key => key !== sectionKey) : [...prev, sectionKey],
    )
  }, [])

  const handleCollapseChange = useCallback(
    (keys: string | string[]) => {
      setActiveSectionKeys(normalizeActiveKeys(keys))
    },
    [normalizeActiveKeys],
  )

  useEffect(() => {
    if (collapseSignal > 0) {
      setActiveSectionKeys([])
    }
  }, [collapseSignal])

  useEffect(() => {
    if (!showRuntimeLimits) {
      setActiveSectionKeys(prev => prev.filter(key => key !== 'runtime-limits'))
    }
  }, [showRuntimeLimits])

  const subjectValidationMessage = useMemo(() => {
    if (!reverseSpec) return null

    if (!reverseSpec.subject.kind) return 'Select a subject kind before running the reverse graph query.'

    return null
  }, [reverseSpec])

  const updateSubject = useCallback(
    (patch: Partial<TRbacReverseQueryPayload['spec']['subject']>) => {
      if (!reverseSpec) return

      const nextSubject = {
        ...reverseSpec.subject,
        ...patch,
      }

      if (nextSubject.kind !== 'ServiceAccount') {
        delete nextSubject.namespace
      }

      onChange(updateSpec(value as TRbacReverseQueryPayload, { subject: nextSubject }) as TPayload)
    },
    [onChange, reverseSpec, value],
  )

  const sectionLabelOptions = useMemo<TSectionLabelOptions>(
    () => ({
      colorPrimary: token.colorPrimary,
      colorFillSecondary: token.colorFillSecondary,
      borderRadiusLG: token.borderRadiusLG,
    }),
    [token.borderRadiusLG, token.colorFillSecondary, token.colorPrimary],
  )

  const sectionItems = useMemo<CollapseProps['items']>(
    () => [
      ...(reverseSpec
        ? [
            {
              key: 'subject',
              label: createSectionLabel(
                {
                  icon: <UserOutlined />,
                  title: 'Subject',
                  activeCount: getSubjectCount(reverseSpec),
                  panelKey: 'subject',
                  isExpanded: activeSectionKeys.includes('subject'),
                  onToggle: toggleSection,
                },
                sectionLabelOptions,
              ),
              collapsible: 'icon' as const,
              children: (
                <Styled.SectionGrid>
                  <Styled.FormRow>
                    <Styled.Label $color={token.colorText}>Subject Kind</Styled.Label>
                    <Select
                      allowClear
                      value={reverseSpec.subject.kind || undefined}
                      onChange={(kind?: TRbacSubjectKind) => updateSubject({ kind: kind ?? '' })}
                      placeholder="Select subject kind"
                      options={[
                        { value: 'ServiceAccount', label: 'ServiceAccount' },
                        { value: 'User', label: 'User' },
                        { value: 'Group', label: 'Group' },
                      ]}
                    />
                  </Styled.FormRow>

                  <Styled.FormRow>
                    <Styled.Label $color={token.colorText}>Subject Name</Styled.Label>
                    <Input
                      value={reverseSpec.subject.name}
                      onChange={e => updateSubject({ name: e.target.value })}
                      placeholder="Subject name"
                    />
                  </Styled.FormRow>

                  <Styled.FormRow>
                    <Styled.Label $color={token.colorText}>Subject Namespace</Styled.Label>
                    <Input
                      value={reverseSpec.subject.namespace}
                      onChange={e => updateSubject({ namespace: e.target.value || undefined })}
                      disabled={reverseSpec.subject.kind !== 'ServiceAccount'}
                      placeholder="Required for ServiceAccount"
                    />
                  </Styled.FormRow>
                </Styled.SectionGrid>
              ),
            },
          ]
        : []),
      {
        key: 'primary-selectors',
        label: createSectionLabel(
          {
            icon: <FilterOutlined />,
            title: 'Primary selectors',
            activeCount: getPrimarySelectorCount(spec),
            panelKey: 'primary-selectors',
            isExpanded: activeSectionKeys.includes('primary-selectors'),
            onToggle: toggleSection,
          },
          sectionLabelOptions,
        ),
        collapsible: 'icon',
        children: (
          <Styled.PrimarySectionGrid>
            <Styled.FormRow $span={6}>
              <Styled.Label $color={token.colorText}>API Groups</Styled.Label>
              <Select
                allowClear
                mode="multiple"
                loading={selectorLoading}
                tokenSeparators={[' ', ',']}
                value={selector.apiGroups}
                options={selectorOptions.apiGroups}
                onChange={apiGroups => onSelectorChange({ apiGroups }, 'apiGroups')}
                placeholder="Select API groups"
              />
            </Styled.FormRow>

            <Styled.FormRow $span={6}>
              <Styled.Label $color={token.colorText}>Verbs</Styled.Label>
              <Select
                allowClear
                mode="tags"
                loading={selectorLoading}
                tokenSeparators={[' ', ',']}
                value={selector.verbs}
                options={selectorOptions.verbs}
                onChange={verbs => onSelectorChange({ verbs }, 'verbs')}
                placeholder="e.g. get, list, watch"
              />
            </Styled.FormRow>

            <Styled.FormRow $span={6}>
              <Styled.Label $color={token.colorText}>Resources</Styled.Label>
              <Select
                allowClear
                mode="multiple"
                loading={selectorLoading}
                tokenSeparators={[' ', ',']}
                value={selector.resources}
                options={selectorOptions.resources}
                onChange={resources => onSelectorChange({ resources }, 'resources')}
                placeholder="Select resources"
              />
            </Styled.FormRow>

            <Styled.FormRow $span={6}>
              <Styled.Label $color={token.colorText}>Resource Names</Styled.Label>
              <Select
                allowClear
                mode="tags"
                tokenSeparators={[' ', ',']}
                value={selector.resourceNames}
                onChange={resourceNames => onSelectorChange({ resourceNames }, 'resourceNames')}
                placeholder="Specific resource names"
              />
            </Styled.FormRow>

            <Styled.FormRow $span={6}>
              <Styled.Label $color={token.colorText}>Non-Resource URLs</Styled.Label>
              <Select
                allowClear
                mode="tags"
                tokenSeparators={[' ', ',']}
                options={selectorOptions.nonResourceURLs}
                value={selector.nonResourceURLs}
                onChange={nonResourceURLs => onSelectorChange({ nonResourceURLs }, 'nonResourceURLs')}
                placeholder="e.g. /healthz, /metrics"
              />
            </Styled.FormRow>
          </Styled.PrimarySectionGrid>
        ),
      },
      {
        key: 'scope-identity',
        label: createSectionLabel(
          {
            icon: <SafetyCertificateOutlined />,
            title: 'Scope & identity',
            activeCount: getScopeIdentityCount(spec),
            panelKey: 'scope-identity',
            isExpanded: activeSectionKeys.includes('scope-identity'),
            onToggle: toggleSection,
          },
          sectionLabelOptions,
        ),
        collapsible: 'icon',
        children: (
          <Styled.SectionGrid>
            <Styled.FormRow>
              <Styled.Label $color={token.colorText}>Match Mode</Styled.Label>
              <Select
                value={spec.matchMode}
                onChange={v => onChange(updateSpec(value, { matchMode: v } as Partial<TPayload['spec']>))}
              >
                <Select.Option value="any">Any</Select.Option>
                <Select.Option value="all">All</Select.Option>
              </Select>
            </Styled.FormRow>

            <Styled.FormRow>
              <Styled.Label $color={token.colorText}>Wildcard Mode</Styled.Label>
              <Select
                value={spec.wildcardMode}
                onChange={v => onChange(updateSpec(value, { wildcardMode: v } as Partial<TPayload['spec']>))}
              >
                <Select.Option value="expand">Expand</Select.Option>
                <Select.Option value="exact">Exact</Select.Option>
              </Select>
            </Styled.FormRow>

            {roleSpec && (
              <>
                <Styled.FormRow>
                  <Styled.Label $color={token.colorText}>Namespace Scope Namespaces</Styled.Label>
                  <Select
                    allowClear
                    mode="tags"
                    tokenSeparators={[' ', ',']}
                    value={roleSpec.namespaceScope?.namespaces ?? []}
                    onChange={v =>
                      onChange(
                        updateSpec(value as TRbacQueryPayload, {
                          namespaceScope:
                            v.length > 0 || roleSpec.namespaceScope?.strict
                              ? { namespaces: v, strict: roleSpec.namespaceScope?.strict ?? false }
                              : undefined,
                        }) as TPayload,
                      )
                    }
                    placeholder="Filter by namespaces"
                  />
                </Styled.FormRow>

                <Styled.FormRow>
                  <Styled.Label $color={token.colorText}>Impersonate User</Styled.Label>
                  <Input
                    value={roleSpec.impersonateUser}
                    onChange={e =>
                      onChange(
                        updateSpec(value as TRbacQueryPayload, {
                          impersonateUser: e.target.value || undefined,
                        }) as TPayload,
                      )
                    }
                    placeholder="Impersonate user"
                  />
                </Styled.FormRow>

                <Styled.FormRow>
                  <Styled.Label $color={token.colorText}>Impersonate Group</Styled.Label>
                  <Input
                    value={roleSpec.impersonateGroup}
                    onChange={e =>
                      onChange(
                        updateSpec(value as TRbacQueryPayload, {
                          impersonateGroup: e.target.value || undefined,
                        }) as TPayload,
                      )
                    }
                    placeholder="Impersonate group"
                  />
                </Styled.FormRow>

                <Styled.GridSpacer aria-hidden />
              </>
            )}

            <Styled.FormRow>
              <Styled.Label $color={token.colorText}>Filter Phantom APIs</Styled.Label>
              <Styled.CheckboxWrap>
                <Checkbox
                  checked={spec.filterPhantomAPIs}
                  onChange={e =>
                    onChange(updateSpec(value, { filterPhantomAPIs: e.target.checked } as Partial<TPayload['spec']>))
                  }
                >
                  Hide phantom API resources
                </Checkbox>
              </Styled.CheckboxWrap>
            </Styled.FormRow>

            {roleSpec ? (
              <Styled.FormRow>
                <Styled.Label $color={token.colorText}>Namespace Scope Strict</Styled.Label>
                <Styled.CheckboxWrap>
                  <Checkbox
                    checked={roleSpec.namespaceScope?.strict ?? false}
                    onChange={e => {
                      const strict = e.target.checked
                      const ns = roleSpec.namespaceScope?.namespaces ?? []
                      onChange(
                        updateSpec(value as TRbacQueryPayload, {
                          namespaceScope: strict || ns.length > 0 ? { namespaces: ns, strict } : undefined,
                        }) as TPayload,
                      )
                    }}
                  >
                    Restrict namespace matches strictly
                  </Checkbox>
                </Styled.CheckboxWrap>
              </Styled.FormRow>
            ) : (
              <Styled.FormRow>
                <Styled.Label $color={token.colorText}>Direct Only</Styled.Label>
                <Styled.CheckboxWrap>
                  <Checkbox
                    checked={Boolean(reverseSpec?.directOnly)}
                    onChange={e =>
                      reverseSpec &&
                      onChange(
                        updateSpec(value as TRbacReverseQueryPayload, { directOnly: e.target.checked }) as TPayload,
                      )
                    }
                  >
                    Include direct bindings only
                  </Checkbox>
                </Styled.CheckboxWrap>
              </Styled.FormRow>
            )}
          </Styled.SectionGrid>
        ),
      },
      ...(showRuntimeLimits && roleSpec
        ? [
            {
              key: 'runtime-limits',
              label: createSectionLabel(
                {
                  icon: <ControlOutlined />,
                  title: 'Runtime limits',
                  activeCount: getRuntimeLimitsCount(roleSpec),
                  panelKey: 'runtime-limits',
                  isExpanded: activeSectionKeys.includes('runtime-limits'),
                  onToggle: toggleSection,
                },
                sectionLabelOptions,
              ),
              collapsible: 'icon' as const,
              children: (
                <Styled.SectionGrid>
                  <Styled.FormRow>
                    <Styled.Label $color={token.colorText}>Pod Phase Mode</Styled.Label>
                    <Select
                      value={roleSpec.podPhaseMode}
                      onChange={v => onChange(updateSpec(value as TRbacQueryPayload, { podPhaseMode: v }) as TPayload)}
                    >
                      <Select.Option value="active">Active</Select.Option>
                      <Select.Option value="running">Running</Select.Option>
                      <Select.Option value="all">All</Select.Option>
                    </Select>
                  </Styled.FormRow>

                  <Styled.FormRow>
                    <Styled.Label $color={token.colorText}>Max Pods per Subject</Styled.Label>
                    <InputNumber
                      min={0}
                      value={roleSpec.maxPodsPerSubject}
                      onChange={v =>
                        onChange(
                          updateSpec(value as TRbacQueryPayload, {
                            maxPodsPerSubject: v ?? DEFAULT_SPEC.maxPodsPerSubject,
                          }) as TPayload,
                        )
                      }
                      style={{ width: '100%' }}
                    />
                  </Styled.FormRow>

                  <Styled.FormRow>
                    <Styled.Label $color={token.colorText}>Max Workloads per Pod</Styled.Label>
                    <InputNumber
                      min={0}
                      value={roleSpec.maxWorkloadsPerPod}
                      onChange={v =>
                        onChange(
                          updateSpec(value as TRbacQueryPayload, {
                            maxWorkloadsPerPod: v ?? DEFAULT_SPEC.maxWorkloadsPerPod,
                          }) as TPayload,
                        )
                      }
                      style={{ width: '100%' }}
                    />
                  </Styled.FormRow>
                </Styled.SectionGrid>
              ),
            },
          ]
        : []),
    ],
    [
      onChange,
      onSelectorChange,
      activeSectionKeys,
      showRuntimeLimits,
      reverseSpec,
      roleSpec,
      sectionLabelOptions,
      selector,
      selectorLoading,
      selectorOptions,
      spec,
      token.colorText,
      toggleSection,
      updateSubject,
      value,
    ],
  )

  const handleSubmit = useCallback(() => {
    if (subjectValidationMessage) {
      setShowSubjectValidation(true)
      return
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    setShowSubjectValidation(false)
    setActiveSectionKeys([])
    onSubmit()
  }, [onSubmit, subjectValidationMessage])

  const handleResetClick = useCallback(() => {
    setShowSubjectValidation(false)
    onReset()
  }, [onReset])

  return (
    <Styled.Container
      $borderRadiusLG={token.borderRadiusLG}
      $colorBgContainer={token.colorBgContainer}
      $colorBorder={token.colorBorder}
    >
      <Styled.Header>
        <Styled.TitleBlock>
          <Styled.TitleRow>
            <Styled.TitleIcon $color={token.colorPrimary}>
              <AppstoreOutlined />
            </Styled.TitleIcon>
            <Styled.Title $color={token.colorText}>Query builder</Styled.Title>
          </Styled.TitleRow>
          <Styled.Description $color={token.colorTextDescription}>
            Configure selectors to visualize RBAC chain
          </Styled.Description>
        </Styled.TitleBlock>

        <Styled.Actions>
          <Button icon={<ClearOutlined />} onClick={handleResetClick} disabled={loading}>
            Reset all
          </Button>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleSubmit} loading={loading}>
            Run query
          </Button>
        </Styled.Actions>
      </Styled.Header>

      {showSubjectValidation && subjectValidationMessage && isReverseMode && (
        <Alert type="warning" showIcon message={subjectValidationMessage} />
      )}

      <Collapse
        items={sectionItems}
        activeKey={activeSectionKeys}
        bordered={false}
        expandIconPosition="end"
        onChange={handleCollapseChange}
      />
    </Styled.Container>
  )
}

import { useState, useCallback } from 'react';
import { Template } from '../../types';
import { DEFAULT_TEMPLATE } from '../../constants';

export function useTemplates(initialTemplates: Template[] = [DEFAULT_TEMPLATE], initialActiveId: string = DEFAULT_TEMPLATE.id) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(initialActiveId);

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0] || DEFAULT_TEMPLATE;

  const addTemplate = useCallback((template: Template) => {
    setTemplates(prev => [...prev, template]);
  }, []);

  const updateTemplate = useCallback((template: Template) => {
    setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    if (templates.length <= 1) return;
    setTemplates(prev => {
      const newTemplates = prev.filter(t => t.id !== id);
      if (activeTemplateId === id) {
        setActiveTemplateId(newTemplates[0].id);
      }
      return newTemplates;
    });
  }, [templates.length, activeTemplateId]);

  const createNewTemplate = useCallback((name: string) => {
    const newTemplate: Template = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      fields: []
    };
    addTemplate(newTemplate);
    return newTemplate;
  }, [addTemplate]);

  const selectTemplate = useCallback((id: string) => {
    setActiveTemplateId(id);
  }, []);

  return {
    templates,
    activeTemplateId,
    activeTemplate,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    createNewTemplate,
    selectTemplate
  };
}

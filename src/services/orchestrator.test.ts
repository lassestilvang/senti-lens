/**
 * @jest-environment node
 */
import { evaluateProactiveSuggestion } from './orchestrator'
import { SceneAnalysis } from './geminiVision'

describe('Orchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('triggers a proactive suggestion if a new object matches the user goal', async () => {
    const memory = {
      environment: 'grocery store',
      objects_seen: ['Cheerios'],
      user_goal: 'find healthy cereal'
    }
    const currentFrameAnalysis: SceneAnalysis = {
      objects: ['Oatmeal'],
      text: 'Healthy',
      environment: 'grocery store'
    }
    
    const result = await evaluateProactiveSuggestion(memory, currentFrameAnalysis)
    
    expect(result.shouldSuggest).toBe(true)
    expect(result.suggestionPrompt).toContain('Oatmeal')
  })

  it('does not trigger if nothing new is relevant', async () => {
    const memory = {
      environment: 'grocery store',
      objects_seen: ['Cheerios'],
      user_goal: 'find fruit'
    }
    const currentFrameAnalysis: SceneAnalysis = {
      objects: ['Frosted Flakes'],
      text: '',
      environment: 'grocery store'
    }
    
    const result = await evaluateProactiveSuggestion(memory, currentFrameAnalysis)
    
    expect(result.shouldSuggest).toBe(false)
  })

  it('does not trigger when user has no goal', async () => {
    const memory = {
      environment: 'grocery store',
      objects_seen: ['Cheerios'],
      user_goal: ''
    }
    const currentFrameAnalysis: SceneAnalysis = {
      objects: ['Oatmeal'],
      text: '',
      environment: 'grocery store'
    }
    
    const result = await evaluateProactiveSuggestion(memory, currentFrameAnalysis)
    
    expect(result.shouldSuggest).toBe(false)
  })
})
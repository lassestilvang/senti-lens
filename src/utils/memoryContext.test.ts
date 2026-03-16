import { buildMemoryContext, addObservationToMemory } from './memoryContext'

describe('Memory Context Builder', () => {
  it('adds an observation and keeps memory within limits', () => {
    let memory: string[] = []
    
    // Add 5 observations
    for (let i = 0; i < 5; i++) {
      memory = addObservationToMemory(memory, `Saw item ${i}`)
    }
    
    expect(memory.length).toBe(5)
    
    // Add more observations to exceed the limit (e.g. 20)
    for (let i = 5; i < 25; i++) {
      memory = addObservationToMemory(memory, `Saw item ${i}`, 20)
    }
    
    // Should be capped at 20 items
    expect(memory.length).toBe(20)
    // The most recent should be item 24
    expect(memory[19]).toBe('Saw item 24')
  })

  it('builds a string context from the array of memories', () => {
    const memory = ['Saw Cheerios', 'Saw Frosted Flakes']
    const contextStr = buildMemoryContext(memory)
    expect(contextStr).toContain('Saw Cheerios')
    expect(contextStr).toContain('Saw Frosted Flakes')
  })
})
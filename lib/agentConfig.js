/Users/latasharma/lib/agentConfig.js// Agent Configuration
// Centralized configuration for the agent architecture

import featureFlags from './featureFlags.js';

export class AgentConfig {
  constructor() {
    this.config = {
      // Master switch for agent architecture
      agentArchitectureEnabled: false, // Set to true to enable COT
      
      // Individual agent switches
      agents: {
        supervisor: true,    // Always enabled if architecture is on
        health: true,        // Health and medication support
        memory: true,        // Memory and cognitive support
        social: true,        // General conversation and companionship
        wellness: true,      // Lifestyle and wellbeing support
        safety: false        // Emergency and safety (disabled by default)
      },
      
      // Performance settings
      performance: {
        maxResponseTime: 5000,    // 5 seconds max response time
        enableFallback: true,     // Fallback to current AI if agents fail
        enableDebugLogging: false // Debug logging for development
      },
      
      // Cost control
      costControl: {
        maxAgentCalls: 3,         // Max specialist agents per request
        enableCostTracking: false, // Track API costs
        budgetLimit: 100          // Monthly budget limit (if tracking enabled)
      }
    };
    
    this.loadFromEnvironment();
  }

  // Load configuration from environment variables
  loadFromEnvironment() {
    // Master switch
    this.config.agentArchitectureEnabled = 
      process.env.EXPO_PUBLIC_ENABLE_AGENTS === 'true' && 
      process.env.EXPO_PUBLIC_ENABLE_SUPERVISOR_AGENT === 'true';
    
    // Individual agents
    this.config.agents.health = process.env.EXPO_PUBLIC_ENABLE_HEALTH_AGENT === 'true';
    this.config.agents.memory = process.env.EXPO_PUBLIC_ENABLE_MEMORY_AGENT === 'true';
    this.config.agents.social = process.env.EXPO_PUBLIC_ENABLE_SOCIAL_AGENT === 'true';
    this.config.agents.wellness = process.env.EXPO_PUBLIC_ENABLE_WELLNESS_AGENT === 'true';
    this.config.agents.safety = process.env.EXPO_PUBLIC_ENABLE_SAFETY_AGENT === 'true';
    
    // Debug logging
    this.config.performance.enableDebugLogging = process.env.EXPO_PUBLIC_DEBUG_AGENTS === 'true';
  }

  // Check if agent architecture is enabled
  isAgentArchitectureEnabled() {
    return this.config.agentArchitectureEnabled;
  }

  // Check if specific agent is enabled
  isAgentEnabled(agentName) {
    if (!this.config.agentArchitectureEnabled) {
      return false;
    }
    return this.config.agents[agentName] === true;
  }

  // Get all enabled agents
  getEnabledAgents() {
    if (!this.config.agentArchitectureEnabled) {
      return [];
    }
    
    return Object.keys(this.config.agents).filter(agent => this.config.agents[agent]);
  }

  // Get performance settings
  getPerformanceSettings() {
    return this.config.performance;
  }

  // Get cost control settings
  getCostControlSettings() {
    return this.config.costControl;
  }

  // Enable agent architecture (for testing/development)
  enableAgentArchitecture() {
    this.config.agentArchitectureEnabled = true;
    console.log('🎯 Agent architecture ENABLED');
  }

  // Disable agent architecture (for production safety)
  disableAgentArchitecture() {
    this.config.agentArchitectureEnabled = false;
    console.log('🔄 Agent architecture DISABLED - using current AI');
  }

  // Get configuration status for debugging
  getStatus() {
    return {
      agentArchitectureEnabled: this.config.agentArchitectureEnabled,
      enabledAgents: this.getEnabledAgents(),
      environment: {
        enableAgents: process.env.EXPO_PUBLIC_ENABLE_AGENTS,
        enableSupervisorAgent: process.env.EXPO_PUBLIC_ENABLE_SUPERVISOR_AGENT,
        enableHealthAgent: process.env.EXPO_PUBLIC_ENABLE_HEALTH_AGENT,
        enableMemoryAgent: process.env.EXPO_PUBLIC_ENABLE_MEMORY_AGENT,
        enableSocialAgent: process.env.EXPO_PUBLIC_ENABLE_SOCIAL_AGENT,
        enableWellnessAgent: process.env.EXPO_PUBLIC_ENABLE_WELLNESS_AGENT,
        enableSafetyAgent: process.env.EXPO_PUBLIC_ENABLE_SAFETY_AGENT,
        debugAgents: process.env.EXPO_PUBLIC_DEBUG_AGENTS
      }
    };
  }

  // Log current configuration
  logStatus() {
    const status = this.getStatus();
    console.log('🔧 Agent Config Status:', status);
  }

  // Validate configuration for production
  validateForProduction() {
    const issues = [];
    
    if (this.config.agentArchitectureEnabled) {
      issues.push('Agent architecture is enabled - consider disabling for production');
    }
    
    if (this.config.performance.enableDebugLogging) {
      issues.push('Debug logging is enabled - consider disabling for production');
    }
    
    if (this.config.agents.safety) {
      issues.push('Safety agent is enabled - ensure proper implementation');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }
}

// Create and export default instance
const agentConfig = new AgentConfig();

// Log initial status
agentConfig.logStatus();

export default agentConfig;

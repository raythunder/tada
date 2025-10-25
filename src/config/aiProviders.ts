// src/config/aiProviders.ts
export interface AIModel {
    id: string;
    name: string;
    description?: string;
}

export interface AIProvider {
    id: 'openai' | 'claude' | 'gemini' | 'xai' | 'openrouter' | 'moonshot' | 'deepseek' | 'qwen' | 'zhipu' | '302' | 'siliconflow' | 'custom';
    name: string;
    models: AIModel[]; // Default/recommended models
    requiresApiKey: boolean;
    requiresBaseUrl?: boolean;
    apiEndpoint: string;
    getHeaders: (apiKey: string) => Record<string, string>;
    listModelsEndpoint?: string; // Optional endpoint for fetching models
    parseModels?: (data: any) => AIModel[]; // Function to parse the model list response
    requestBodyTransformer?: (body: any) => any; // Optional transformer for non-standard body formats
}

export const AI_PROVIDERS: AIProvider[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        requiresApiKey: true,
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        listModelsEndpoint: 'https://api.openai.com/v1/models',
        getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
        parseModels: (data) => data.data
            .filter((m: any) => m.id.includes('gpt'))
            .map((m: any) => ({ id: m.id, name: m.id })),
        models: [
            {id: 'gpt-4o', name: 'GPT-4o (recommended)'},
            {id: 'gpt-4-turbo', name: 'GPT-4 Turbo (recommended)'},
            {id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (recommended)'},
        ],
    },
    {
        id: 'claude',
        name: 'Anthropic (Claude)',
        requiresApiKey: true,
        apiEndpoint: 'https://api.anthropic.com/v1/messages',
        getHeaders: (apiKey) => ({
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        }),
        models: [
            {id: 'claude-3-opus-20240229', name: 'Claude 3 Opus'},
            {id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet'},
            {id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku'},
        ],
        // No listModelsEndpoint; models are listed in docs
    },
    {
        id: 'gemini',
        name: 'Google (Gemini)',
        requiresApiKey: true,
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}',
        listModelsEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}',
        getHeaders: () => ({ 'Content-Type': 'application/json' }),
        parseModels: (data) => data.models
            .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
            .map((m: any) => ({ id: m.name.replace('models/', ''), name: m.displayName })),
        requestBodyTransformer: (body: any) => {
            const contents = body.messages.map((msg: any) => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));
            return {
                contents,
                generationConfig: {
                    temperature: body.temperature,
                    topP: body.top_p,
                    topK: body.top_k,
                    maxOutputTokens: body.max_tokens,
                    stopSequences: body.stop,
                },
                // Add safetySettings if needed from body
            };
        },
        models: [
            {id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (recommended)'},
            {id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (recommended)'},
        ],
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        requiresApiKey: true,
        apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
        listModelsEndpoint: 'https://openrouter.ai/api/v1/models',
        getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
        parseModels: (data) => data.data.map((m: any) => ({ id: m.id, name: m.name })),
        models: [
            {id: 'openrouter/auto', name: 'Auto (recommended)'},
            {id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash (recommended)'},
            {id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku (recommended)'},
        ]
    },
    {
        id: 'moonshot',
        name: 'Moonshot AI (Kimi)',
        requiresApiKey: true,
        apiEndpoint: 'https://api.moonshot.cn/v1/chat/completions',
        listModelsEndpoint: 'https://api.moonshot.cn/v1/models',
        getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }),
        parseModels: (data) => data.data.map((m: any) => ({ id: m.id, name: m.id })),
        models: [
            {id: 'moonshot-v1-8k', name: 'moonshot-v1-8k'},
            {id: 'moonshot-v1-32k', name: 'moonshot-v1-32k'},
            {id: 'moonshot-v1-128k', name: 'moonshot-v1-128k'},
        ]
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        requiresApiKey: true,
        apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
        listModelsEndpoint: 'https://api.deepseek.com/v1/models',
        getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }),
        parseModels: (data) => data.data.map((m: any) => ({ id: m.id, name: m.id })),
        models: [
            {id: 'deepseek-chat', name: 'DeepSeek Chat'},
            {id: 'deepseek-coder', name: 'DeepSeek Coder'},
        ]
    },
    {
        id: 'qwen',
        name: 'Alibaba (Qwen)',
        requiresApiKey: true,
        apiEndpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        listModelsEndpoint: 'https://dashscope.aliyuncs.com/api/v1/models', // Assumed based on OpenAI compatibility claims
        getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }),
        parseModels: (data) => data.data.map((m: any) => ({ id: m.id, name: m.id })),
        requestBodyTransformer: (body: any) => ({
            model: body.model,
            input: {
                messages: body.messages,
            },
            parameters: {
                top_p: body.top_p,
                temperature: body.temperature,
                max_tokens: body.max_tokens,
                stop: body.stop,
                frequency_penalty: body.frequency_penalty,
                presence_penalty: body.presence_penalty,
            },
        }),
        models: [
            {id: 'qwen-turbo', name: 'Qwen Turbo'},
            {id: 'qwen-plus', name: 'Qwen Plus'},
            {id: 'qwen-max', name: 'Qwen Max'},
        ]
    },
    {
        id: 'zhipu',
        name: 'Zhipu AI (GLM)',
        requiresApiKey: true,
        apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        listModelsEndpoint: 'https://open.bigmodel.cn/api/paas/v4/models',
        getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }),
        parseModels: (data) => data.data.map((m: any) => ({ id: m.id, name: m.id })),
        models: [
            {id: 'glm-4', name: 'GLM-4'},
            {id: 'glm-3-turbo', name: 'GLM-3 Turbo'},
        ]
    },
    {
        id: 'xai',
        name: 'xAI (Grok)',
        requiresApiKey: true,
        apiEndpoint: 'https://api.x.ai/v1/chat/completions',
        listModelsEndpoint: 'https://api.x.ai/v1/models',
        getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }),
        parseModels: (data) => data.models.map((m: any) => ({ id: m.id, name: m.name })),
        models: [
            {id: 'grok-1.5-flash', name: 'Grok 1.5 Flash'},
            {id: 'grok-1.5', name: 'Grok 1.5'},
        ]
    },
    {
        id: '302',
        name: '302.AI',
        requiresApiKey: true,
        apiEndpoint: 'https://api.302.ai/v1/chat/completions',
        listModelsEndpoint: 'https://api.302.ai/v1/models',
        getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }),
        // FIX: Changed data.models to data.data to match the actual API response structure
        parseModels: (data) => data.data.map((m: any) => ({ id: m.id, name: m.name })),
        models: [
            {id: 'gpt-4o', name: 'GPT-4o'},
            {id: 'claude-3-opus', name: 'Claude 3 Opus'},
        ]
    },
    {
        id: 'siliconflow',
        name: 'SiliconFlow',
        requiresApiKey: true,
        apiEndpoint: 'https://api.siliconflow.cn/v1/chat/completions',
        listModelsEndpoint: 'https://api.siliconflow.cn/v1/models',
        getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }),
        parseModels: (data) => data.data.map((m: any) => ({ id: m.id, name: m.id })),
        models: [
            {id: 'deepseek-ai/DeepSeek-V2-Chat', name: 'DeepSeek V2 Chat'},
            {id: 'alibaba/Qwen2-72B-Instruct', name: 'Qwen2 72B Instruct'},
        ]
    },
    {
        id: 'custom',
        name: 'Custom (OpenAI-like)',
        requiresApiKey: true,
        requiresBaseUrl: true,
        apiEndpoint: '/v1/chat/completions',
        listModelsEndpoint: '/v1/models',
        getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
        parseModels: (data) => data.data.map((m: any) => ({ id: m.id, name: m.id })),
        models: [
            {id: 'custom-model', name: 'Custom Model (Editable)'},
        ]
    }
];
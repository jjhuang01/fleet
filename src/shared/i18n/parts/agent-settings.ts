/**
 * Agent settings surface strings.
 *
 * Keys are flat `surface.thing`; see the contract in en.ts.
 */

export const en = {
  'agentSettings.title': 'Agent settings',
  'agentSettings.description': 'Shared by every agent pane in Fleet.',
  'agentSettings.common.add': 'Add',
  'agentSettings.common.all': 'All',
  'agentSettings.common.cancel': 'Cancel',
  'agentSettings.common.default': 'Default',
  'agentSettings.common.engine': 'Engine',
  'agentSettings.common.loading': 'Loading…',
  'agentSettings.common.none': 'None',
  'agentSettings.common.off': 'Off',
  'agentSettings.common.on': 'On',
  'agentSettings.common.remove': 'Remove',
  'agentSettings.common.save': 'Save',
  'agentSettings.controls.reset': 'Reset {label}',
  'agentSettings.controls.resetTo': 'Reset to {value}',

  'agentSettings.provider.title': 'Provider',
  'agentSettings.provider.key.label': 'OpenRouter API key',
  'agentSettings.provider.key.description':
    'Optional. Stored encrypted on this device, and never sent anywhere but OpenRouter. Without one, Fleet runs on the local servers below - though image generation and voice dictation are OpenRouter’s alone and stay off.',
  'agentSettings.provider.key.placeholder': 'sk-or-…',
  'agentSettings.provider.key.errorSpaces': 'Keys cannot contain spaces.',
  'agentSettings.provider.key.errorPrefix': 'OpenRouter keys start with "sk-or-".',

  'agentSettings.models.title': 'Models',
  'agentSettings.coding.title': 'Coding agent',
  'agentSettings.coding.description':
    'Writes code and drives tools. Only models that support tool calling are listed.',
  'agentSettings.model.placeholder': 'Select a model',
  'agentSettings.model.search': 'Search models…',
  'agentSettings.model.noMatches': 'No models match.',
  'agentSettings.model.offline': '{label} · offline',
  'agentSettings.model.contextShort': '{tokens} ctx',
  'agentSettings.model.outputShort': '{tokens} out',
  'agentSettings.model.tools': 'Tools',
  'agentSettings.model.vision': 'Vision',
  'agentSettings.model.imageGeneration': 'Image generation',
  'agentSettings.model.cost': '{input} / {output} per 1M',
  'agentSettings.model.useCodingModel': 'Use the coding model',

  'agentSettings.role.maxOutput.label': 'Max output tokens',
  'agentSettings.role.maxOutput.hint':
    "Left alone, a reply may run to the model's full output limit.",
  'agentSettings.role.maxOutput.default': 'model max',
  'agentSettings.role.temperature.label': 'Temperature',
  'agentSettings.role.temperature.hint':
    'Lower is more deterministic. Coding usually wants the low end.',
  'agentSettings.role.temperature.providerDefault': 'provider default',
  'agentSettings.role.temperature.modelDefault': 'model default',
  'agentSettings.role.reasoning.label': 'Reasoning',
  'agentSettings.role.reasoning.hint': 'Let the model think before it answers.',
  'agentSettings.role.effort.label': 'Reasoning effort',
  'agentSettings.role.effort.hint': 'How much thinking the model budgets per turn.',
  'agentSettings.role.effort.hintDefault':
    'How much thinking the model budgets per turn. Default is {effort}.',
  'agentSettings.role.thinkingBudget.label': 'Thinking budget',
  'agentSettings.role.thinkingBudget.hint':
    'Tokens the model may spend reasoning before it replies.',
  'agentSettings.role.thinkingBudget.default': 'medium effort',
  'agentSettings.role.fact.context': '{tokens} context',
  'agentSettings.role.fact.maxOutput': '{tokens} max output',
  'agentSettings.role.fact.toolCalling': 'Tool calling',
  'agentSettings.role.fact.noToolCalling': 'No tool calling',
  'agentSettings.role.fact.released': 'Released {date}',

  'agentSettings.image.title': 'Image agent',
  'agentSettings.image.description':
    'Generates and edits images on request. With none selected, the agent is not offered the tool at all.',
  'agentSettings.image.none': 'None - image generation off',
  'agentSettings.image.missingModel':
    'The images endpoint does not list this model. Pick another, or refresh the catalog below.',
  'agentSettings.image.resolution.label': 'Resolution',
  'agentSettings.image.resolution.hint':
    'How large the image comes back. Bigger costs more and takes longer.',
  'agentSettings.image.quality.label': 'Quality',
  'agentSettings.image.quality.hint': 'How much work the model puts into the render.',
  'agentSettings.image.meta.upTo': 'up to {resolution}',
  'agentSettings.image.meta.reference': '{count} reference',
  'agentSettings.image.meta.references': '{count} references',
  'agentSettings.image.meta.quality': 'quality',
  'agentSettings.image.meta.seed': 'seed',
  'agentSettings.image.meta.streams': 'streams',
  'agentSettings.image.pricing': 'Pricing and samples on OpenRouter',
  'agentSettings.image.seed.label': 'Seed',
  'agentSettings.image.seed.hint':
    'Fix it to get the same picture from the same prompt. Empty means a new one each time.',
  'agentSettings.image.seed.placeholder': 'Random',
  'agentSettings.image.seed.resetTitle': 'Back to a new seed each time',
  'agentSettings.image.seed.resetAria': 'Reset seed',

  'agentSettings.advisor.title': 'Advisor',
  'agentSettings.advisor.description':
    'Lets the coding model consult a stronger one mid-turn - before committing to an approach, when it is stuck, before calling a task done. OpenRouter runs the consultation and bills per question.',
  'agentSettings.advisor.enabled.label': 'Consult a stronger model',
  'agentSettings.advisor.enabled.hint':
    'The advisor cannot see this folder or this conversation. It answers the question it is given, and nothing else.',
  'agentSettings.advisor.model.label': 'Advisor model',
  'agentSettings.advisor.model.hint':
    'Worth being dearer than the coding model - a cheaper second opinion is the first opinion again. Until one is chosen the tool is not offered at all.',
  'agentSettings.advisor.model.none': 'No advisor',
  'agentSettings.advisor.model.placeholder': 'Choose a model',
  'agentSettings.advisor.instructions.label': 'Instructions',
  'agentSettings.advisor.instructions.hint':
    'Optional. Who the advisor should be - “a staff engineer who has maintained this kind of system for ten years, and is decisive”.',
  'agentSettings.advisor.instructions.placeholder': 'Left blank, the advisor answers as itself.',
  'agentSettings.advisor.maxTokens.label': 'Advice length',
  'agentSettings.advisor.maxTokens.hint':
    'Tokens for one consultation, thinking included. Paid for twice: once to write, and again every round it stays in the transcript.',

  'agentSettings.fusion.title': 'Panel review',
  'agentSettings.fusion.description':
    'Run /fusion in a chat to put a change in front of several models at once and have a further one reconcile them. One model call per panel member plus the analyst, billed per review.',
  'agentSettings.fusion.panel.label': 'Panel',
  'agentSettings.fusion.panel.hint':
    'Up to {count}. Left empty, OpenRouter picks a panel of current frontier models and keeps that choice current - which is usually better than a list written here and left to age. Choose your own when you want models that disagree in particular ways.',
  'agentSettings.fusion.panel.remove': 'Remove {name} from the panel',
  'agentSettings.fusion.panel.addOrDefault': "Add a model, or leave OpenRouter's",
  'agentSettings.fusion.panel.add': 'Add a model',
  'agentSettings.fusion.analyst.label': 'Analyst',
  'agentSettings.fusion.analyst.hint':
    'Reads every reply and reports the agreement, the disagreements and what only one model saw. Left unset it is the model running the chat, which is a fair default - this is summarising opinions rather than forming one.',
  'agentSettings.fusion.analyst.model': 'The model running the chat',
  'agentSettings.fusion.replyLength.label': 'Reply length',
  'agentSettings.fusion.replyLength.hint':
    'Tokens for one reply, thinking included. Every panel member gets this, so it multiplies.',
  'agentSettings.fusion.lookups.label': 'Lookups per model',
  'agentSettings.fusion.lookups.hint':
    'Web searches and fetches one panel member may make while forming its answer. Multiplied by the size of the panel.',

  'agentSettings.cache.title': 'Prompt caching',
  'agentSettings.cache.description':
    'Marks the part of a request that repeats - the instructions, and the rounds already finished - so a provider can charge for it once instead of on every round. Some providers do this on their own; Anthropic and Qwen only do it when asked.',
  'agentSettings.cache.enabled.label': 'Ask for a cached prefix',
  'agentSettings.cache.enabled.hint':
    'Read back at about a tenth of the price on the providers that support it, and ignored by the ones that do not.',
  'agentSettings.cache.longTtl.label': 'Keep it for an hour',
  'agentSettings.cache.longTtl.hint':
    'Five minutes otherwise. The hour costs more to write, so it pays off on a conversation you come back to rather than on one long turn.',

  'agentSettings.routing.title': 'Provider routing',
  'agentSettings.routing.description':
    'One model is served by several companies at different prices and speeds. Left alone, OpenRouter picks. Only affects OpenRouter - a server on this machine is its own provider.',
  'agentSettings.routing.sort.label': 'Pick by',
  'agentSettings.routing.sort.hint':
    'Cheapest, fastest to finish, or quickest to start. Left on balanced, OpenRouter weighs price against how reliable a provider has been.',
  'agentSettings.routing.sort.balanced': 'Balanced',
  'agentSettings.routing.sort.cheapest': 'Cheapest',
  'agentSettings.routing.sort.fastest': 'Fastest',
  'agentSettings.routing.sort.quickest': 'Quickest to start',
  'agentSettings.routing.order.label': 'Try first',
  'agentSettings.routing.order.hint':
    'Provider slugs, one per line, in the order you want them tried. Anything not listed still gets a turn after these.',
  'agentSettings.routing.only.label': 'Only these',
  'agentSettings.routing.only.hint':
    'A wall rather than a preference: nothing outside this list may serve the request. Leave empty for anyone.',
  'agentSettings.routing.ignore.label': 'Never these',
  'agentSettings.routing.ignore.hint':
    'Providers that must not serve the request, whatever else is set.',
  'agentSettings.routing.requireParameters.label': 'Must support every setting',
  'agentSettings.routing.requireParameters.hint':
    'Off, a provider that cannot honour a setting answers anyway and ignores it - a model asked to think that did not, which reads as a worse model rather than as a dropped setting.',
  'agentSettings.routing.allowFallbacks.label': 'Fall through to anyone else',
  'agentSettings.routing.allowFallbacks.hint':
    'On, the lists above are a preference. Off, they are a requirement, and a turn nobody on them can serve fails instead.',
  'agentSettings.routing.maxPromptPrice.label': 'Most per million input tokens',
  'agentSettings.routing.maxCompletionPrice.label': 'Most per million output tokens',
  'agentSettings.routing.price.hint':
    'A rate, not a budget: it rules out expensive providers and says nothing about what a turn will spend. Empty for no ceiling.',
  'agentSettings.routing.price.placeholder': 'any',

  'agentSettings.fallback.title': 'Fallback models',
  'agentSettings.fallback.description':
    'Tried in order when the coding model is down or refuses the request. Only the one that answers is billed, so an unused fallback costs nothing. The pane names whichever model served each turn.',
  'agentSettings.fallback.none': 'No fallback',
  'agentSettings.fallback.addAnother': 'Add another',

  'agentSettings.sessions.title': 'Sessions',
  'agentSettings.sessions.titleModel.label': 'Title model',
  'agentSettings.sessions.titleModel.description':
    'Names a session once its first turn finishes. Any model will do - naming calls no tools.',
  'agentSettings.voice.title': 'Voice dictation',
  'agentSettings.voice.model.label': 'Dictation model',
  'agentSettings.voice.model.description':
    'Turns a spoken prompt into text. Only Groq-served models honour the recognition hints (project name, branch, coding terms); the others transcribe without them.',
  'agentSettings.voice.hints.label': 'Recognition hints',
  'agentSettings.voice.hints.onDescription':
    'The project name, branch and coding vocabulary go up with the audio, so identifiers come back spelled the way they are written.',
  'agentSettings.voice.hints.offDescription':
    'This model ignores them, so identifiers may transcribe imprecisely.',

  'agentSettings.permissions.title': 'Permissions',
  'agentSettings.permissions.whoAnswers.label': 'Who answers',
  'agentSettings.permissions.whoAnswers.description':
    'What a command your rules have not settled does next. The picker in the composer sets the same thing. Full access runs everything but a deny rule, and is back to Ask on the next start.',
  'agentSettings.permissions.mode.ask': 'Ask every time',
  'agentSettings.permissions.mode.auto': 'Auto: decide the ordinary ones',
  'agentSettings.permissions.mode.full': 'Full access: never ask',
  'agentSettings.permissions.classifier.label': 'Auto-approval model',
  'agentSettings.permissions.classifier.description':
    'Judges one command at a time in Auto. Small and fast is what this wants - it never sees the conversation, only the command line.',

  'agentSettings.endpoint.dialog.addTitle': 'Add a local server',
  'agentSettings.endpoint.dialog.editTitle': 'Edit server',
  'agentSettings.endpoint.dialog.description':
    'Its models join the pickers above, alongside the OpenRouter ones.',
  'agentSettings.endpoint.dialog.address.label': 'Address',
  'agentSettings.endpoint.dialog.address.description':
    'Where the server is listening. Fleet takes every model it serves - and a plain llama-server serves one, so a second model there is a second entry here.',
  'agentSettings.endpoint.dialog.test': 'Test',
  'agentSettings.endpoint.dialog.name.label': 'Name',
  'agentSettings.endpoint.dialog.name.description':
    'Optional. Without one it is known by its address, which is usually clearer.',
  'agentSettings.endpoint.dialog.name.placeholder': 'Workstation',
  'agentSettings.endpoint.dialog.errorDuplicate': 'That address is already set up.',
  'agentSettings.endpoint.dialog.add': 'Add server',
  'agentSettings.endpoint.dialog.warningSave':
    'You can still save it - Fleet will check again when the server is up.',

  'agentSettings.endpoint.local.title': 'Local models',
  'agentSettings.endpoint.local.empty': 'No local servers.',
  'agentSettings.endpoint.local.emptyHint':
    'Point Fleet at a llama.cpp, Ollama, LM Studio or vLLM server on this machine and every model it serves joins the pickers below. A plain llama-server serves one, so a second model there means a second address.',
  'agentSettings.endpoint.local.add': 'Add server',
  'agentSettings.endpoint.local.scan': 'Look for servers',
  'agentSettings.endpoint.row.enable': 'Enable {name}',
  'agentSettings.endpoint.row.edit': 'Edit…',
  'agentSettings.endpoint.row.recheck': 'Check again',
  'agentSettings.endpoint.row.noModel': 'This server has no model loaded.',
  'agentSettings.endpoint.row.nothingSeen': 'Nothing seen here yet.',
  'agentSettings.endpoint.row.models': 'Models',
  'agentSettings.endpoint.row.savedWhileDown':
    'Still listed while the server is down, so your choice is kept.',
  'agentSettings.endpoint.scan.title': 'Look for local servers',
  'agentSettings.endpoint.scan.description':
    'Fleet checks the usual ports on this machine - nothing leaves it.',
  'agentSettings.endpoint.scan.checking': 'Checking…',
  'agentSettings.endpoint.scan.notChecked': 'Nothing checked yet. Press Check to look.',
  'agentSettings.endpoint.scan.none': 'Nothing found.',
  'agentSettings.endpoint.scan.noneHint':
    'Only the common ports are checked. If your server is on another one, close this and add its address directly.',
  'agentSettings.endpoint.scan.added': 'Added',
  'agentSettings.endpoint.scan.done': 'Done',
  'agentSettings.endpoint.scan.check': 'Check',
  'agentSettings.endpoint.scan.checkAgain': 'Check again',
  'agentSettings.endpoint.statusNotChecked': 'Not checked',
  'agentSettings.endpoint.statusChecking': 'Checking…',
  'agentSettings.endpoint.statusReadyNone': 'No models',
  'agentSettings.endpoint.statusReadyOne': '1 model',
  'agentSettings.endpoint.statusReadyOther': '{count} models',
  'agentSettings.endpoint.statusIdleOne': '1 model, idle',
  'agentSettings.endpoint.statusIdleOther': '{count} models, idle',
  'agentSettings.endpoint.statusSavedOne': '1 model, saved',
  'agentSettings.endpoint.statusSavedOther': '{count} models, saved',
  'agentSettings.endpoint.failureRefusedTitle': 'Not running',
  'agentSettings.endpoint.failureTimeoutTitle': 'No answer',
  'agentSettings.endpoint.failureLoadingTitle': 'Starting up',
  'agentSettings.endpoint.failureAuthRequiredTitle': 'Needs a key',
  'agentSettings.endpoint.failureNoModelsTitle': 'No model loaded',
  'agentSettings.endpoint.failureNotOpenAiTitle': 'Not a model server',
  'agentSettings.endpoint.failureUnreachableTitle': 'Unreachable',
  'agentSettings.endpoint.failureRefusedHint':
    'Nothing is listening on {hostPort}. Start the server, then check again.',
  'agentSettings.endpoint.failureTimeoutHint':
    '{hostPort} accepted the connection but never replied. It may still be starting.',
  'agentSettings.endpoint.failureLoadingHint':
    'The server is loading its model. This can take a while for a large one - check again in a moment.',
  'agentSettings.endpoint.failureAuthRequiredHint':
    'This server wants an API key, which Fleet has nowhere to put yet. Restart it without one to use it here.',
  'agentSettings.endpoint.failureNoModelsHint': 'The server is running but has no model loaded.',
  'agentSettings.endpoint.failureNotOpenAiHint':
    'Something is listening on {hostPort}, but it does not answer like a model server.',
  'agentSettings.endpoint.failureUnreachableHint': 'Fleet could not reach {hostPort}.',
  'agentSettings.endpoint.testFoundLlama': 'Found a llama.cpp',
  'agentSettings.endpoint.testFoundLlamaIdle': 'Found a llama.cpp, idle',
  'agentSettings.endpoint.testFoundOpenAi': 'Found a OpenAI-compatible server',
  'agentSettings.endpoint.testFoundOpenAiIdle': 'Found a OpenAI-compatible server, idle',
  'agentSettings.endpoint.testServing': 'Serving {models}.',
  'agentSettings.endpoint.testNoModel': 'It is running but has no model loaded.',
  'agentSettings.endpoint.errorAddressEmpty': 'Enter the address the server is running on.',
  'agentSettings.endpoint.errorAddressInvalid': '“{input}” is not an address Fleet can read.',
  'agentSettings.endpoint.errorAddressScheme': 'The address has to start with http:// or https://.',
  'agentSettings.endpoint.errorAddressMissingHost': 'The address is missing a host name.',
  'agentSettings.endpoint.errorAddressPath':
    'Leave off the path - “{origin}” is the whole address Fleet needs.',

  'agentSettings.mcp.title': 'MCP servers',
  'agentSettings.mcp.empty': 'No servers connected.',
  'agentSettings.mcp.description':
    'MCP servers give the agent tools Fleet does not have - a docs index, a ticket tracker, a design library.',
  'agentSettings.mcp.add': 'Add server',
  'agentSettings.mcp.import': 'Import',
  'agentSettings.mcp.toolCount.one': '{tools} tool from {servers} servers',
  'agentSettings.mcp.toolCount.many': '{tools} tools from {servers} servers',
  'agentSettings.mcp.crowded':
    'Past about {count} tools models start picking the wrong one. Switch off the tools you do not use, on the servers above.',
  'agentSettings.mcp.row.enable': 'Enable {name}',
  'agentSettings.mcp.row.edit': 'Edit…',
  'agentSettings.mcp.row.reconnect': 'Reconnect',
  'agentSettings.mcp.row.signOut': 'Sign out',
  'agentSettings.mcp.row.needsAuth': 'This server wants you to sign in.',
  'agentSettings.mcp.row.signIn': 'Sign in',
  'agentSettings.mcp.row.noTools': 'This server offers no tools.',
  'agentSettings.mcp.row.noToolsYet': 'No tools yet.',
  'agentSettings.mcp.row.tools': 'Tools',
  'agentSettings.mcp.state.connected': 'Connected',
  'agentSettings.mcp.state.connecting': 'Connecting…',
  'agentSettings.mcp.state.needsAuth': 'Needs sign-in',
  'agentSettings.mcp.state.failed': 'Not connected',
  'agentSettings.mcp.toolSummary.one': '{count} tool',
  'agentSettings.mcp.toolSummary.many': '{count} tools',
  'agentSettings.mcp.status.known': 'have',
  'agentSettings.mcp.status.new': 'new',
  'agentSettings.mcp.status.changed': 'changed',
  'agentSettings.mcp.add.title': 'Add MCP server',
  'agentSettings.mcp.add.editTitle': 'Edit {name}',
  'agentSettings.mcp.add.description': 'Its tools become available to every agent pane.',
  'agentSettings.mcp.add.tab.form': 'Form',
  'agentSettings.mcp.add.tab.paste': 'Paste JSON',
  'agentSettings.mcp.add.paste.label': 'Server JSON',
  'agentSettings.mcp.add.paste.description':
    'Either {"mcpServers": {…}} or the servers on their own. Paste it straight from the docs.',
  'agentSettings.mcp.add.name.label': 'Name',
  'agentSettings.mcp.add.kind.label': 'Kind',
  'agentSettings.mcp.add.kind.local': 'Local command',
  'agentSettings.mcp.add.kind.remote': 'Remote URL',
  'agentSettings.mcp.add.command.label': 'Command',
  'agentSettings.mcp.add.args.label': 'Arguments',
  'agentSettings.mcp.add.args.description':
    'One per line, so an argument with a space in it needs no quoting.',
  'agentSettings.mcp.add.env.label': 'Environment',
  'agentSettings.mcp.add.env.description':
    'KEY=value, one per line. Anything that looks like a credential is stored encrypted.',
  'agentSettings.mcp.add.url.label': 'URL',
  'agentSettings.mcp.add.auth.label': 'Sign-in',
  'agentSettings.mcp.add.auth.none': 'None',
  'agentSettings.mcp.add.auth.bearer': 'Bearer token',
  'agentSettings.mcp.add.auth.oauth': 'Sign in with the browser (OAuth)',
  'agentSettings.mcp.add.token.label': 'Token',
  'agentSettings.mcp.add.token.description':
    'Stored encrypted on this device when you save, and never shown again.',
  'agentSettings.mcp.add.token.placeholder': 'Paste the token',
  'agentSettings.mcp.add.headers.label': 'Headers',
  'agentSettings.mcp.add.headers.description':
    'Name: value, one per line. For anything the server wants besides the token.',
  'agentSettings.mcp.add.add': 'Add server',
  'agentSettings.mcp.add.errorDuplicate': 'There is already a server called "{name}".',
  'agentSettings.mcp.add.errorName': 'Give the server a name.',
  'agentSettings.mcp.add.errorCommand': 'A local server needs a command to run.',
  'agentSettings.mcp.add.errorUrl': 'A remote server needs a URL.',
  'agentSettings.mcp.add.pasteErrorEmpty': 'Nothing to read yet.',
  'agentSettings.mcp.add.pasteErrorInvalidJson': 'That is not valid JSON.',
  'agentSettings.mcp.add.pasteErrorNoServers': 'That JSON does not describe any MCP servers.',
  'agentSettings.mcp.add.pasteErrorUnusableServer': 'No server in there had a command or a URL.',
  'agentSettings.mcp.import.title': 'Import MCP servers',
  'agentSettings.mcp.import.description':
    'Fleet keeps its own copy, so editing one here changes nothing over there.',
  'agentSettings.mcp.import.looking': 'Looking for servers…',
  'agentSettings.mcp.import.empty': 'No servers found in Claude Code or OpenCode.',
  'agentSettings.mcp.import.emptyHint':
    'Fleet looks in their user configs and in this project’s folder.',
  'agentSettings.mcp.import.credentials':
    'Credentials come across too, into this device’s keychain.',
  'agentSettings.mcp.import.submit.one': 'Import 1 server',
  'agentSettings.mcp.import.submit.many': 'Import {count} servers',
  'agentSettings.mcp.import.group.claudeCode.allProjects': 'Claude Code · all projects',
  'agentSettings.mcp.import.group.claudeCode.thisProject': 'Claude Code · this project',
  'agentSettings.mcp.import.group.openCode.allProjects': 'OpenCode · all projects',
  'agentSettings.mcp.import.group.openCode.thisProject': 'OpenCode · this project',

  'agentSettings.skills.title': 'Skills',
  'agentSettings.skills.empty': 'No skills installed.',
  'agentSettings.skills.description':
    'A skill is a folder of instructions the agent reads when it needs them - a house style, a release checklist, how to drive one awkward tool.',
  'agentSettings.skills.import': 'Import',
  'agentSettings.skills.fromRepository': 'From a repository',
  'agentSettings.skills.installError': '{name} was not installed - {reason}.',
  'agentSettings.skills.showInFinder': 'Show in Finder',
  'agentSettings.skills.status.known': 'have',
  'agentSettings.skills.status.new': 'new',
  'agentSettings.skills.status.changed': 'changed',
  'agentSettings.skills.source.fleet.allProjects': 'Fleet · all projects',
  'agentSettings.skills.source.fleet.thisProject': 'Fleet · this project',
  'agentSettings.skills.source.claudeCode.allProjects': 'Claude Code · all projects',
  'agentSettings.skills.source.claudeCode.thisProject': 'Claude Code · this project',
  'agentSettings.skills.source.openCode.allProjects': 'OpenCode · all projects',
  'agentSettings.skills.source.openCode.thisProject': 'OpenCode · this project',
  'agentSettings.skills.source.agents.allProjects': 'Agents · all projects',
  'agentSettings.skills.source.agents.thisProject': 'Agents · this project',
  'agentSettings.skills.source.repository': 'Repository',
  'agentSettings.skills.importDialog.title': 'Import skills',
  'agentSettings.skills.importDialog.description':
    'Fleet copies the whole folder, so editing one here changes nothing over there.',
  'agentSettings.skills.importDialog.looking': 'Looking for skills…',
  'agentSettings.skills.importDialog.empty': 'No skills found on this machine.',
  'agentSettings.skills.importDialog.emptyHint':
    'Fleet looks in Claude Code, OpenCode and ~/.agents, for the user and for this project.',
  'agentSettings.skills.importDialog.scripts': 'Scripts and reference files come across too.',
  'agentSettings.skills.importDialog.submit.one': 'Import 1 skill',
  'agentSettings.skills.importDialog.submit.many': 'Import {count} skills',
  'agentSettings.skills.fetchDialog.title': 'Get skills from a repository',
  'agentSettings.skills.fetchDialog.description':
    'Fleet clones it, shows what is inside, and keeps only what you pick.',
  'agentSettings.skills.fetchDialog.cloning': 'Cloning…',
  'agentSettings.skills.fetchDialog.clone': 'Clone',
  'agentSettings.skills.fetchDialog.cloningRepo': 'Cloning {repo}…',
  'agentSettings.skills.fetchDialog.empty': 'A repository with SKILL.md folders in it.',
  'agentSettings.skills.fetchDialog.emptyHint': 'owner/repo, an https URL, or an ssh one.',
  'agentSettings.skills.fetchDialog.submit.one': 'Install 1 skill',
  'agentSettings.skills.fetchDialog.submit.many': 'Install {count} skills',

  'agentSettings.memory.title': 'Memory',
  'agentSettings.memory.empty': 'Nothing recorded yet.',
  'agentSettings.memory.description':
    'The agent writes a note here when a session teaches it something the next one would otherwise work out again. Run /refine to ask it to look back over a conversation.',
  'agentSettings.memory.thisProject': 'This project',
  'agentSettings.memory.everywhere': 'Everywhere',
  'agentSettings.memory.showInFinder': 'Show in Finder',

  'agentSettings.instructions.title': 'Instructions',
  'agentSettings.systemPrompt.label': 'System prompt',
  'agentSettings.systemPrompt.description':
    'Replaces the built-in instructions. The working folder is always appended, so the agent still knows where it is.',
  'agentSettings.systemPrompt.custom': 'Custom prompt.',
  'agentSettings.systemPrompt.default': 'Using the default prompt.',
  'agentSettings.systemPrompt.reset': 'Reset to default',
  'agentSettings.context.title': 'Context',
  'agentSettings.compaction.enabled.label': 'Compact automatically',
  'agentSettings.compaction.enabled.hint':
    "Summarize the earlier messages once the conversation fills this much of the model's context window. The last few exchanges are always kept word for word.",
  'agentSettings.compaction.at': 'Compact at',
  'agentSettings.compaction.percentFull': '{percent}% full',
  'agentSettings.maxToolRounds.enabled.label': 'Limit tool rounds',
  'agentSettings.maxToolRounds.enabled.hint':
    'Stop a turn after this many rounds of tool calls. Off means it runs until it has an answer, which is what long work needs - a turn that hits a limit has already spent what it cost to get there.',
  'agentSettings.maxToolRounds.stopAfter': 'Stop after',
  'agentSettings.maxToolRounds.rounds': 'rounds',

  'agentSettings.classifier.label': 'Auto-approval notes',
  'agentSettings.classifier.description':
    'Added to the instructions below, for what only you know: a disposable container where installs are fine, a folder whose scripts are never ordinary.',
  'agentSettings.classifier.placeholder':
    'e.g. This repo runs in a throwaway container, so installing packages is fine. Never wave through anything under ./deploy.',
  'agentSettings.classifier.custom': 'Your notes are being sent.',
  'agentSettings.classifier.default': 'Using the built-in instructions alone.',
  'agentSettings.classifier.clear': 'Clear notes',
  'agentSettings.classifier.builtIn': 'What the model is always told',

  'agentSettings.toolSearch.title': 'Deferred tools',
  'agentSettings.toolSearch.description':
    'Holds back the tools from your connected servers until the agent searches for one. They stay usable - the agent is just told about them later, so it stops paying to have every one described on every round.',
  'agentSettings.toolSearch.enabled.label': 'Hold back server tools',
  'agentSettings.toolSearch.maxResults.label': 'Tools per search',
  'agentSettings.toolSearch.maxResults.hint':
    'How many tools one search may load. A small number keeps the saving; the agent can always search again.',
  'agentSettings.toolSearch.hint.noKey':
    'Needs an OpenRouter API key. The search runs on OpenRouter, not here.',
  'agentSettings.toolSearch.hint.noServers':
    'Nothing to hold back yet - this starts saving once you connect a server under Tools.',
  'agentSettings.toolSearch.hint.oneServer':
    'Holds back the tools from your server. The first turn that needs one spends a round finding it, and every round after that is cheaper.',
  'agentSettings.toolSearch.hint.manyServers':
    'Holds back the tools from your {count} servers. The first turn that needs one spends a round finding it, and every round after that is cheaper.',

  'agentSettings.web.title': 'Web pages',
  'agentSettings.web.description':
    'Lets the agent read a page by URL - documentation, a changelog, an issue - and get it back as markdown. Switched off, it is not offered the tool at all.',
  'agentSettings.web.enabled.label': 'Read web pages',
  'agentSettings.web.enabled.hint':
    'Pages that need JavaScript are run in a browser first, so most documentation sites work.',
  'agentSettings.web.local.label': 'Allow local addresses',
  'agentSettings.web.local.hint':
    'Lets it read a dev server on this machine, or something else on your network. Cloud metadata addresses are always refused, whatever this says.',
  'agentSettings.web.maxChars.label': 'Characters per page',
  'agentSettings.web.maxChars.hint':
    'Anything past this is cut, with a note saying so. A long page is mostly navigation.',
  'agentSettings.web.maxChars.resetTitle': 'Back to {value}',
  'agentSettings.web.maxChars.resetAria': 'Reset characters per page',

  'agentSettings.webSearch.title': 'Web search',
  'agentSettings.webSearch.description':
    'Lets the agent search the web when it does not already know the address of the answer. OpenRouter runs the search; Fleet shows you the sources.',
  'agentSettings.webSearch.enabled.label': 'Search the web',
  'agentSettings.webSearch.enabled.hint':
    'Billed per search by OpenRouter, on top of the tokens the results cost to read.',
  'agentSettings.webSearch.enabled.noKey':
    'Needs an OpenRouter API key. Searches run on OpenRouter, not on this machine.',
  'agentSettings.webSearch.engine.hint':
    "Exa is the predictable choice: one price and one set of limits whatever model you pick. Auto uses the model's own search when it has one, which changes both.",
  'agentSettings.webSearch.maxResults.label': 'Results per search',
  'agentSettings.webSearch.maxResults.hint':
    'Each result brings an excerpt with it, and the excerpts are what you pay tokens for.',
  'agentSettings.webSearch.maxSearches.label': 'Searches per round',
  'agentSettings.webSearch.maxSearches.hint':
    'Per round, not per turn: a turn is many rounds, and this number starts again on each one. The spend brake below is what bounds a whole turn.',
  'agentSettings.webSearch.spend.label': 'Spend brake',
  'agentSettings.webSearch.spend.hint':
    'Roughly this many dollars of searching per round before OpenRouter is asked to wind up. It finishes what it started, so the bill lands a little above. Empty for no brake.',

  'agentSettings.hostedFetch.title': 'Hosted page reader',
  'agentSettings.hostedFetch.description':
    "A second way to read a page, running on OpenRouter. Worth it for public PDFs and for pages Fleet's own reader cannot extract. It cannot reach this machine or this network.",
  'agentSettings.hostedFetch.enabled.label': 'Read pages on OpenRouter too',
  'agentSettings.hostedFetch.enabled.hint':
    'Fleet keeps reading pages itself by default. This adds a second reader for the public pages the first one struggles with.',
  'agentSettings.hostedFetch.enabled.noKey':
    'Needs an OpenRouter API key. Fetches run on OpenRouter, not on this machine.',
  'agentSettings.hostedFetch.engine.hint':
    "OpenRouter's own is a plain fetch and is free. Exa and Parallel are $1 per 1,000 fetches and extract more from an awkward page. Firecrawl spends your own Firecrawl credits.",
  'agentSettings.hostedFetch.maxFetches.label': 'Fetches per round',
  'agentSettings.hostedFetch.maxFetches.hint':
    'Per round, not per turn: a turn is many rounds and this number starts again on each one.',
  'agentSettings.hostedFetch.blocked.label': 'Never read',
  'agentSettings.hostedFetch.blocked.hint':
    'Hosts this reader must refuse, one per line. Applies whether or not the list below is set.',
  'agentSettings.hostedFetch.allowed.label': 'Only read',
  'agentSettings.hostedFetch.allowed.hint':
    'Leave empty for anything public. Filling it in means the reader refuses everything else, which is a list you then have to keep up to date.',
  'agentSettings.hostedFetch.pageLength.label': 'Page length',
  'agentSettings.hostedFetch.pageLength.hint':
    'Approximate tokens of one page that reach the model. Leave empty to let the engine decide. Longer pages are cut, not refused.',
  'agentSettings.hostedFetch.pageLength.placeholder': 'engine',

  'agentSettings.catalog.loading': 'Loading models…',
  'agentSettings.catalog.empty': 'No models loaded yet.',
  'agentSettings.catalog.localOnly.one': '1 local model. No OpenRouter models downloaded.',
  'agentSettings.catalog.localOnly.many': '{count} local models. No OpenRouter models downloaded.',
  'agentSettings.catalog.counts': '{count} OpenRouter models and {imageCount} image models',
  'agentSettings.catalog.updated': 'Updated {age}.',
  'agentSettings.catalog.local.one': '1 local model is also available.',
  'agentSettings.catalog.local.many': '{count} local models are also available.',
  'agentSettings.catalog.refresh': 'Refresh',
  'agentSettings.catalog.error':
    'Could not refresh the OpenRouter model lists ({error}). Showing the last downloaded ones.',
  'agentSettings.catalog.localUnaffected': 'Your local models are unaffected.',
  'agentSettings.catalog.age.justNow': 'just now',
  'agentSettings.catalog.age.minutes': '{count}m ago',
  'agentSettings.catalog.age.hours': '{count}h ago',
  'agentSettings.catalog.age.days': '{count}d ago',

  'agentSettings.secret.saveError': 'Could not save. Try again.',
  'agentSettings.secret.saved': 'Saved',
  'agentSettings.secret.stored': 'Key stored',
  'agentSettings.secret.encrypted': 'encrypted',
  'agentSettings.secret.replace': 'Replace',
  'agentSettings.secret.hide': 'Hide key',
  'agentSettings.secret.show': 'Show key',
  'agentSettings.rowMenu.moreActions': 'More actions for {label}'
} as const;

export const zh: Record<keyof typeof en, string> = {
  'agentSettings.title': 'Agent 设置',
  'agentSettings.description': 'Fleet 中所有 Agent 窗格共用。',
  'agentSettings.common.add': '添加',
  'agentSettings.common.all': '全选',
  'agentSettings.common.cancel': '取消',
  'agentSettings.common.default': '默认',
  'agentSettings.common.engine': '引擎',
  'agentSettings.common.loading': '加载中…',
  'agentSettings.common.none': '无',
  'agentSettings.common.off': '关闭',
  'agentSettings.common.on': '开启',
  'agentSettings.common.remove': '移除',
  'agentSettings.common.save': '保存',
  'agentSettings.controls.reset': '重置{label}',
  'agentSettings.controls.resetTo': '重置为 {value}',

  'agentSettings.provider.title': '服务商',
  'agentSettings.provider.key.label': 'OpenRouter API 密钥',
  'agentSettings.provider.key.description':
    '可选。密钥会加密存储在本机，只会发送给 OpenRouter。不配置时，Fleet 使用下面的本地服务；不过图像生成和语音听写仅由 OpenRouter 提供，将保持关闭。',
  'agentSettings.provider.key.placeholder': 'sk-or-…',
  'agentSettings.provider.key.errorSpaces': '密钥不能包含空格。',
  'agentSettings.provider.key.errorPrefix': 'OpenRouter 密钥以 "sk-or-" 开头。',

  'agentSettings.models.title': '模型',
  'agentSettings.coding.title': '编码 Agent',
  'agentSettings.coding.description': '负责编写代码和调用工具。这里只列出支持工具调用的模型。',
  'agentSettings.model.placeholder': '选择模型',
  'agentSettings.model.search': '搜索模型…',
  'agentSettings.model.noMatches': '没有匹配的模型。',
  'agentSettings.model.offline': '{label} · 离线',
  'agentSettings.model.contextShort': '{tokens} 上下文',
  'agentSettings.model.outputShort': '{tokens} 输出',
  'agentSettings.model.tools': '工具',
  'agentSettings.model.vision': '视觉',
  'agentSettings.model.imageGeneration': '图像生成',
  'agentSettings.model.cost': '{input} / {output} 每 1M',
  'agentSettings.model.useCodingModel': '使用编码模型',

  'agentSettings.role.maxOutput.label': '最大输出 Token',
  'agentSettings.role.maxOutput.hint': '不设置时，回复可以使用模型允许的完整输出上限。',
  'agentSettings.role.maxOutput.default': '模型上限',
  'agentSettings.role.temperature.label': '温度',
  'agentSettings.role.temperature.hint': '数值越低越确定。编码任务通常适合较低值。',
  'agentSettings.role.temperature.providerDefault': '服务商默认',
  'agentSettings.role.temperature.modelDefault': '模型默认',
  'agentSettings.role.reasoning.label': '推理',
  'agentSettings.role.reasoning.hint': '让模型回答前先思考。',
  'agentSettings.role.effort.label': '推理强度',
  'agentSettings.role.effort.hint': '模型每轮用于思考的预算。',
  'agentSettings.role.effort.hintDefault': '模型每轮用于思考的预算。默认值为 {effort}。',
  'agentSettings.role.thinkingBudget.label': '思考预算',
  'agentSettings.role.thinkingBudget.hint': '模型在回复前可用于推理的 Token 数。',
  'agentSettings.role.thinkingBudget.default': '中等强度',
  'agentSettings.role.fact.context': '{tokens} 上下文',
  'agentSettings.role.fact.maxOutput': '{tokens} 最大输出',
  'agentSettings.role.fact.toolCalling': '支持工具调用',
  'agentSettings.role.fact.noToolCalling': '不支持工具调用',
  'agentSettings.role.fact.released': '发布于 {date}',

  'agentSettings.image.title': '图像 Agent',
  'agentSettings.image.description':
    '按请求生成和编辑图像。未选择模型时，不会向 Agent 提供该工具。',
  'agentSettings.image.none': '无 - 关闭图像生成',
  'agentSettings.image.missingModel': '图像端点未列出此模型。请选择其他模型，或刷新下方目录。',
  'agentSettings.image.resolution.label': '分辨率',
  'agentSettings.image.resolution.hint': '返回图像的尺寸。越大费用越高，耗时也越长。',
  'agentSettings.image.quality.label': '质量',
  'agentSettings.image.quality.hint': '模型在渲染上投入的工作量。',
  'agentSettings.image.meta.upTo': '最高 {resolution}',
  'agentSettings.image.meta.reference': '{count} 张参考图',
  'agentSettings.image.meta.references': '{count} 张参考图',
  'agentSettings.image.meta.quality': '质量',
  'agentSettings.image.meta.seed': '种子',
  'agentSettings.image.meta.streams': '流式输出',
  'agentSettings.image.pricing': '在 OpenRouter 查看价格和示例',
  'agentSettings.image.seed.label': '种子',
  'agentSettings.image.seed.hint': '固定后，同一提示词会得到同一张图。留空则每次都生成新图。',
  'agentSettings.image.seed.placeholder': '随机',
  'agentSettings.image.seed.resetTitle': '恢复为每次生成新种子',
  'agentSettings.image.seed.resetAria': '重置种子',

  'agentSettings.advisor.title': '顾问',
  'agentSettings.advisor.description':
    '允许编码模型在一轮中咨询更强的模型：提交方案前、卡住时或宣布任务完成前。咨询由 OpenRouter 执行，并按问题计费。',
  'agentSettings.advisor.enabled.label': '咨询更强的模型',
  'agentSettings.advisor.enabled.hint': '顾问看不到此文件夹或当前对话。它只回答交给它的问题。',
  'agentSettings.advisor.model.label': '顾问模型',
  'agentSettings.advisor.model.hint':
    '价格高于编码模型才有意义，更便宜的第二个意见往往只是重复第一个意见。未选择模型时不会提供该工具。',
  'agentSettings.advisor.model.none': '不使用顾问',
  'agentSettings.advisor.model.placeholder': '选择模型',
  'agentSettings.advisor.instructions.label': '指令',
  'agentSettings.advisor.instructions.hint':
    '可选。描述顾问应扮演的角色，例如“维护此类系统十年且决策果断的资深工程师”。',
  'agentSettings.advisor.instructions.placeholder': '留空时，顾问按自身默认方式回答。',
  'agentSettings.advisor.maxTokens.label': '建议长度',
  'agentSettings.advisor.maxTokens.hint':
    '一次咨询的 Token 数，包含思考。费用会计算两次：生成时一次，留在对话记录期间的每一轮再计一次。',

  'agentSettings.fusion.title': '多模型评审',
  'agentSettings.fusion.description':
    '在对话中运行 /fusion，将变更同时交给多个模型，再由另一个模型汇总。每个面板成员和汇总模型各调用一次，并逐次计费。',
  'agentSettings.fusion.panel.label': '评审面板',
  'agentSettings.fusion.panel.hint':
    '最多 {count} 个。留空时，OpenRouter 会选择当前的前沿模型并自动更新；这通常优于手工列表。若希望模型以特定方式产生分歧，可自行选择。',
  'agentSettings.fusion.panel.remove': '从面板中移除 {name}',
  'agentSettings.fusion.panel.addOrDefault': '添加模型，或保留 OpenRouter 的选择',
  'agentSettings.fusion.panel.add': '添加模型',
  'agentSettings.fusion.analyst.label': '汇总模型',
  'agentSettings.fusion.analyst.hint':
    '读取所有回复，报告共识、分歧以及只有某个模型发现的内容。未设置时使用当前对话模型，这个默认值合理，因为这里汇总的是观点而不是形成新观点。',
  'agentSettings.fusion.analyst.model': '当前对话模型',
  'agentSettings.fusion.replyLength.label': '回复长度',
  'agentSettings.fusion.replyLength.hint':
    '每个回复的 Token 数，包含思考。面板中的每个模型都会使用该上限，因此会成倍增加。',
  'agentSettings.fusion.lookups.label': '每个模型的查询次数',
  'agentSettings.fusion.lookups.hint':
    '每个面板成员在形成答案时可进行的网页搜索和抓取次数。会按面板大小成倍增加。',

  'agentSettings.cache.title': '提示词缓存',
  'agentSettings.cache.description':
    '标记请求中重复的部分，例如指令和已完成的轮次，使服务商只收费一次，而不是每轮重复收费。有些服务商会自动缓存；Anthropic 和 Qwen 只缓存明确标记的部分。',
  'agentSettings.cache.enabled.label': '请求缓存前缀',
  'agentSettings.cache.enabled.hint':
    '支持的服务商会按约十分之一的价格读取，不支持的服务商会忽略此标记。',
  'agentSettings.cache.longTtl.label': '缓存一小时',
  'agentSettings.cache.longTtl.hint':
    '否则缓存五分钟。一小时缓存的写入费用更高，更适合会回来继续的对话，而不是一次长时间运行。',

  'agentSettings.routing.title': '服务商路由',
  'agentSettings.routing.description':
    '同一模型可能由多家公司以不同价格和速度提供。默认由 OpenRouter 选择。仅影响 OpenRouter；本机服务本身就是独立服务商。',
  'agentSettings.routing.sort.label': '排序方式',
  'agentSettings.routing.sort.hint':
    '最便宜、最快完成或最快开始。保持均衡时，OpenRouter 会在价格和服务商可靠性之间权衡。',
  'agentSettings.routing.sort.balanced': '均衡',
  'agentSettings.routing.sort.cheapest': '最便宜',
  'agentSettings.routing.sort.fastest': '最快完成',
  'agentSettings.routing.sort.quickest': '最快开始',
  'agentSettings.routing.order.label': '优先尝试',
  'agentSettings.routing.order.hint':
    '服务商标识，每行一个，按尝试顺序排列。未列出的服务商仍会在这些之后被尝试。',
  'agentSettings.routing.only.label': '仅允许',
  'agentSettings.routing.only.hint':
    '这不是偏好而是限制：列表外的服务商不能处理请求。留空表示不限制。',
  'agentSettings.routing.ignore.label': '禁止使用',
  'agentSettings.routing.ignore.hint': '无论其他设置如何，这些服务商都不能处理请求。',
  'agentSettings.routing.requireParameters.label': '必须支持所有设置',
  'agentSettings.routing.requireParameters.hint':
    '关闭时，无法满足设置的服务商仍会回答并忽略该设置，看起来像模型变差，而不像设置被丢弃。',
  'agentSettings.routing.allowFallbacks.label': '允许回退到其他服务商',
  'agentSettings.routing.allowFallbacks.hint':
    '开启时，上方列表只是偏好。关闭时它们是硬性要求，列表内无人可用则本轮失败。',
  'agentSettings.routing.maxPromptPrice.label': '每百万输入 Token 最高价',
  'agentSettings.routing.maxCompletionPrice.label': '每百万输出 Token 最高价',
  'agentSettings.routing.price.hint':
    '这是单价上限，不是预算：它会排除高价服务商，但不限制一轮最终花费。留空表示不设上限。',
  'agentSettings.routing.price.placeholder': '不限',

  'agentSettings.fallback.title': '备用模型',
  'agentSettings.fallback.description':
    '编码模型不可用或拒绝请求时，按顺序尝试这些模型。只有实际回答的模型会计费，因此未触发的备用模型不会产生费用。每个窗格会显示实际使用的模型。',
  'agentSettings.fallback.none': '无备用模型',
  'agentSettings.fallback.addAnother': '添加另一个',

  'agentSettings.sessions.title': '会话',
  'agentSettings.sessions.titleModel.label': '标题模型',
  'agentSettings.sessions.titleModel.description':
    '首轮结束后为会话命名。任意模型均可，命名不会调用工具。',
  'agentSettings.voice.title': '语音听写',
  'agentSettings.voice.model.label': '听写模型',
  'agentSettings.voice.model.description':
    '将语音提示转换为文本。只有 Groq 提供的模型会使用识别提示（项目名、分支和编码术语），其他模型会直接转写。',
  'agentSettings.voice.hints.label': '识别提示',
  'agentSettings.voice.hints.onDescription':
    '项目名、分支和编码词汇会随音频一起发送，因此标识符会按原始拼写返回。',
  'agentSettings.voice.hints.offDescription': '此模型会忽略提示，标识符可能转写不准确。',

  'agentSettings.permissions.title': '权限',
  'agentSettings.permissions.whoAnswers.label': '由谁决定',
  'agentSettings.permissions.whoAnswers.description':
    '规则未覆盖的命令如何处理。输入区的选择器也会设置同一项。完全访问会执行除拒绝规则外的一切操作，并在下次启动时恢复为询问。',
  'agentSettings.permissions.mode.ask': '每次询问',
  'agentSettings.permissions.mode.auto': '自动：判断常规命令',
  'agentSettings.permissions.mode.full': '完全访问：不再询问',
  'agentSettings.permissions.classifier.label': '自动批准模型',
  'agentSettings.permissions.classifier.description':
    '在自动模式下逐条判断命令。适合使用小而快的模型；它看不到对话，只会看到命令行。',

  'agentSettings.endpoint.dialog.addTitle': '添加本地服务',
  'agentSettings.endpoint.dialog.editTitle': '编辑服务',
  'agentSettings.endpoint.dialog.description':
    '它的模型会和 OpenRouter 模型一起出现在上方的选择器中。',
  'agentSettings.endpoint.dialog.address.label': '地址',
  'agentSettings.endpoint.dialog.address.description':
    '服务监听地址。Fleet 会接收它提供的所有模型；普通 llama-server 只提供一个模型，因此第二个模型需要另一个地址。',
  'agentSettings.endpoint.dialog.test': '测试',
  'agentSettings.endpoint.dialog.name.label': '名称',
  'agentSettings.endpoint.dialog.name.description': '可选。未填写时使用地址作为名称，通常更清晰。',
  'agentSettings.endpoint.dialog.name.placeholder': '工作站',
  'agentSettings.endpoint.dialog.errorDuplicate': '该地址已经配置。',
  'agentSettings.endpoint.dialog.add': '添加服务',
  'agentSettings.endpoint.dialog.warningSave': '仍可保存，服务恢复后 Fleet 会再次检查。',

  'agentSettings.endpoint.local.title': '本地模型',
  'agentSettings.endpoint.local.empty': '没有本地服务。',
  'agentSettings.endpoint.local.emptyHint':
    '将 Fleet 指向本机的 llama.cpp、Ollama、LM Studio 或 vLLM 服务，它提供的模型会加入下方选择器。普通 llama-server 只提供一个模型，第二个模型需要另一个地址。',
  'agentSettings.endpoint.local.add': '添加服务',
  'agentSettings.endpoint.local.scan': '查找服务',
  'agentSettings.endpoint.row.enable': '启用 {name}',
  'agentSettings.endpoint.row.edit': '编辑…',
  'agentSettings.endpoint.row.recheck': '重新检查',
  'agentSettings.endpoint.row.noModel': '此服务未加载模型。',
  'agentSettings.endpoint.row.nothingSeen': '尚未发现任何内容。',
  'agentSettings.endpoint.row.models': '模型',
  'agentSettings.endpoint.row.savedWhileDown': '服务离线时仍会列出，以保留你的选择。',
  'agentSettings.endpoint.scan.title': '查找本地服务',
  'agentSettings.endpoint.scan.description': 'Fleet 只检查本机常用端口，不会发送任何数据。',
  'agentSettings.endpoint.scan.checking': '检查中…',
  'agentSettings.endpoint.scan.notChecked': '尚未检查。点击“检查”开始。',
  'agentSettings.endpoint.scan.none': '未找到服务。',
  'agentSettings.endpoint.scan.noneHint':
    '只会检查常用端口。如果服务在其他端口，请关闭此窗口并直接添加地址。',
  'agentSettings.endpoint.scan.added': '已添加',
  'agentSettings.endpoint.scan.done': '完成',
  'agentSettings.endpoint.scan.check': '检查',
  'agentSettings.endpoint.scan.checkAgain': '重新检查',
  'agentSettings.endpoint.statusNotChecked': '尚未检查',
  'agentSettings.endpoint.statusChecking': '检查中…',
  'agentSettings.endpoint.statusReadyNone': '无模型',
  'agentSettings.endpoint.statusReadyOne': '1 个模型',
  'agentSettings.endpoint.statusReadyOther': '{count} 个模型',
  'agentSettings.endpoint.statusIdleOne': '1 个模型，空闲',
  'agentSettings.endpoint.statusIdleOther': '{count} 个模型，空闲',
  'agentSettings.endpoint.statusSavedOne': '已保存 1 个模型',
  'agentSettings.endpoint.statusSavedOther': '已保存 {count} 个模型',
  'agentSettings.endpoint.failureRefusedTitle': '未运行',
  'agentSettings.endpoint.failureTimeoutTitle': '无响应',
  'agentSettings.endpoint.failureLoadingTitle': '正在启动',
  'agentSettings.endpoint.failureAuthRequiredTitle': '需要密钥',
  'agentSettings.endpoint.failureNoModelsTitle': '未加载模型',
  'agentSettings.endpoint.failureNotOpenAiTitle': '不是模型服务',
  'agentSettings.endpoint.failureUnreachableTitle': '无法访问',
  'agentSettings.endpoint.failureRefusedHint': '{hostPort} 上没有服务监听。请启动服务后重试。',
  'agentSettings.endpoint.failureTimeoutHint':
    '{hostPort} 已接受连接，但没有响应。服务可能仍在启动。',
  'agentSettings.endpoint.failureLoadingHint':
    '服务正在加载模型。大型模型可能需要一些时间，请稍后重试。',
  'agentSettings.endpoint.failureAuthRequiredHint':
    '此服务要求 API 密钥，而 Fleet 暂不支持。请不配置密钥重启服务后再使用。',
  'agentSettings.endpoint.failureNoModelsHint': '服务正在运行，但未加载模型。',
  'agentSettings.endpoint.failureNotOpenAiHint': '{hostPort} 上有服务监听，但响应不像模型服务。',
  'agentSettings.endpoint.failureUnreachableHint': 'Fleet 无法连接 {hostPort}。',
  'agentSettings.endpoint.testFoundLlama': '找到 llama.cpp',
  'agentSettings.endpoint.testFoundLlamaIdle': '找到 llama.cpp，当前空闲',
  'agentSettings.endpoint.testFoundOpenAi': '找到 OpenAI 兼容服务',
  'agentSettings.endpoint.testFoundOpenAiIdle': '找到 OpenAI 兼容服务，当前空闲',
  'agentSettings.endpoint.testServing': '正在提供 {models}。',
  'agentSettings.endpoint.testNoModel': '服务正在运行，但未加载模型。',
  'agentSettings.endpoint.errorAddressEmpty': '请输入服务监听的地址。',
  'agentSettings.endpoint.errorAddressInvalid': '“{input}” 不是 Fleet 能识别的地址。',
  'agentSettings.endpoint.errorAddressScheme': '地址必须以 http:// 或 https:// 开头。',
  'agentSettings.endpoint.errorAddressMissingHost': '地址缺少主机名。',
  'agentSettings.endpoint.errorAddressPath': '请去掉路径 - “{origin}” 就是 Fleet 需要的完整地址。',

  'agentSettings.mcp.title': 'MCP 服务',
  'agentSettings.mcp.empty': '没有已连接的服务。',
  'agentSettings.mcp.description':
    'MCP 服务为 Agent 提供 Fleet 没有的工具，例如文档索引、工单系统或设计库。',
  'agentSettings.mcp.add': '添加服务',
  'agentSettings.mcp.import': '导入',
  'agentSettings.mcp.toolCount.one': '{tools} 个工具，来自 {servers} 个服务',
  'agentSettings.mcp.toolCount.many': '{tools} 个工具，来自 {servers} 个服务',
  'agentSettings.mcp.crowded':
    '工具超过约 {count} 个后，模型容易选错。请在上方服务中关闭不用的工具。',
  'agentSettings.mcp.row.enable': '启用 {name}',
  'agentSettings.mcp.row.edit': '编辑…',
  'agentSettings.mcp.row.reconnect': '重新连接',
  'agentSettings.mcp.row.signOut': '退出登录',
  'agentSettings.mcp.row.needsAuth': '此服务需要登录。',
  'agentSettings.mcp.row.signIn': '登录',
  'agentSettings.mcp.row.noTools': '此服务未提供工具。',
  'agentSettings.mcp.row.noToolsYet': '暂无工具。',
  'agentSettings.mcp.row.tools': '工具',
  'agentSettings.mcp.state.connected': '已连接',
  'agentSettings.mcp.state.connecting': '连接中…',
  'agentSettings.mcp.state.needsAuth': '需要登录',
  'agentSettings.mcp.state.failed': '未连接',
  'agentSettings.mcp.toolSummary.one': '{count} 个工具',
  'agentSettings.mcp.toolSummary.many': '{count} 个工具',
  'agentSettings.mcp.status.known': '已有',
  'agentSettings.mcp.status.new': '新增',
  'agentSettings.mcp.status.changed': '有变更',
  'agentSettings.mcp.add.title': '添加 MCP 服务',
  'agentSettings.mcp.add.editTitle': '编辑 {name}',
  'agentSettings.mcp.add.description': '它的工具将对所有 Agent 窗格可用。',
  'agentSettings.mcp.add.tab.form': '表单',
  'agentSettings.mcp.add.tab.paste': '粘贴 JSON',
  'agentSettings.mcp.add.paste.label': '服务 JSON',
  'agentSettings.mcp.add.paste.description':
    '可以是 {"mcpServers": {…}}，也可以直接粘贴服务列表。可直接从文档复制。',
  'agentSettings.mcp.add.name.label': '名称',
  'agentSettings.mcp.add.kind.label': '类型',
  'agentSettings.mcp.add.kind.local': '本地命令',
  'agentSettings.mcp.add.kind.remote': '远程 URL',
  'agentSettings.mcp.add.command.label': '命令',
  'agentSettings.mcp.add.args.label': '参数',
  'agentSettings.mcp.add.args.description': '每行一个参数，因此含空格的参数无需加引号。',
  'agentSettings.mcp.add.env.label': '环境变量',
  'agentSettings.mcp.add.env.description': 'KEY=value，每行一个。看起来像凭据的内容会加密存储。',
  'agentSettings.mcp.add.url.label': 'URL',
  'agentSettings.mcp.add.auth.label': '登录方式',
  'agentSettings.mcp.add.auth.none': '无',
  'agentSettings.mcp.add.auth.bearer': 'Bearer Token',
  'agentSettings.mcp.add.auth.oauth': '使用浏览器登录（OAuth）',
  'agentSettings.mcp.add.token.label': 'Token',
  'agentSettings.mcp.add.token.description': '保存时会加密存储在本机，之后不再显示。',
  'agentSettings.mcp.add.token.placeholder': '粘贴 Token',
  'agentSettings.mcp.add.headers.label': '请求头',
  'agentSettings.mcp.add.headers.description':
    'Name: value，每行一个。用于服务需要的 Token 之外的信息。',
  'agentSettings.mcp.add.add': '添加服务',
  'agentSettings.mcp.add.errorDuplicate': '已存在名为“{name}”的服务。',
  'agentSettings.mcp.add.errorName': '请为服务填写名称。',
  'agentSettings.mcp.add.errorCommand': '本地服务需要运行命令。',
  'agentSettings.mcp.add.errorUrl': '远程服务需要 URL。',
  'agentSettings.mcp.add.pasteErrorEmpty': '还没有可读取的内容。',
  'agentSettings.mcp.add.pasteErrorInvalidJson': '不是有效的 JSON。',
  'agentSettings.mcp.add.pasteErrorNoServers': '这段 JSON 没有描述任何 MCP 服务。',
  'agentSettings.mcp.add.pasteErrorUnusableServer': '其中没有包含命令或 URL 的可用服务。',
  'agentSettings.mcp.import.title': '导入 MCP 服务',
  'agentSettings.mcp.import.description': 'Fleet 会保留自己的副本，因此在这里编辑不会影响原文件。',
  'agentSettings.mcp.import.looking': '正在查找服务…',
  'agentSettings.mcp.import.empty': '未在 Claude Code 或 OpenCode 中找到服务。',
  'agentSettings.mcp.import.emptyHint': 'Fleet 会检查它们的用户配置以及当前项目的文件夹。',
  'agentSettings.mcp.import.credentials': '凭据也会一并导入本机钥匙串。',
  'agentSettings.mcp.import.submit.one': '导入 1 个服务',
  'agentSettings.mcp.import.submit.many': '导入 {count} 个服务',
  'agentSettings.mcp.import.group.claudeCode.allProjects': 'Claude Code · 所有项目',
  'agentSettings.mcp.import.group.claudeCode.thisProject': 'Claude Code · 当前项目',
  'agentSettings.mcp.import.group.openCode.allProjects': 'OpenCode · 所有项目',
  'agentSettings.mcp.import.group.openCode.thisProject': 'OpenCode · 当前项目',

  'agentSettings.skills.title': 'Skills',
  'agentSettings.skills.empty': '没有已安装的 Skill。',
  'agentSettings.skills.description':
    'Skill 是一个指令文件夹，Agent 需要时会读取，例如团队风格、发布清单或某个难用工具的操作方法。',
  'agentSettings.skills.import': '导入',
  'agentSettings.skills.fromRepository': '从仓库获取',
  'agentSettings.skills.installError': '{name} 未安装 - {reason}。',
  'agentSettings.skills.showInFinder': '在 Finder 中显示',
  'agentSettings.skills.status.known': '已有',
  'agentSettings.skills.status.new': '新增',
  'agentSettings.skills.status.changed': '有变更',
  'agentSettings.skills.source.fleet.allProjects': 'Fleet · 所有项目',
  'agentSettings.skills.source.fleet.thisProject': 'Fleet · 当前项目',
  'agentSettings.skills.source.claudeCode.allProjects': 'Claude Code · 所有项目',
  'agentSettings.skills.source.claudeCode.thisProject': 'Claude Code · 当前项目',
  'agentSettings.skills.source.openCode.allProjects': 'OpenCode · 所有项目',
  'agentSettings.skills.source.openCode.thisProject': 'OpenCode · 当前项目',
  'agentSettings.skills.source.agents.allProjects': 'Agents · 所有项目',
  'agentSettings.skills.source.agents.thisProject': 'Agents · 当前项目',
  'agentSettings.skills.source.repository': '仓库',
  'agentSettings.skills.importDialog.title': '导入 Skill',
  'agentSettings.skills.importDialog.description':
    'Fleet 会复制整个文件夹，因此在这里编辑不会影响原文件。',
  'agentSettings.skills.importDialog.looking': '正在查找 Skill…',
  'agentSettings.skills.importDialog.empty': '本机未找到 Skill。',
  'agentSettings.skills.importDialog.emptyHint':
    'Fleet 会检查 Claude Code、OpenCode 和 ~/.agents 中的用户级及当前项目 Skill。',
  'agentSettings.skills.importDialog.scripts': '脚本和参考文件也会一起导入。',
  'agentSettings.skills.importDialog.submit.one': '导入 1 个 Skill',
  'agentSettings.skills.importDialog.submit.many': '导入 {count} 个 Skill',
  'agentSettings.skills.fetchDialog.title': '从仓库获取 Skill',
  'agentSettings.skills.fetchDialog.description':
    'Fleet 会克隆仓库、显示内容，并只保留你选择的部分。',
  'agentSettings.skills.fetchDialog.cloning': '正在克隆…',
  'agentSettings.skills.fetchDialog.clone': '克隆',
  'agentSettings.skills.fetchDialog.cloningRepo': '正在克隆 {repo}…',
  'agentSettings.skills.fetchDialog.empty': '仓库中包含 SKILL.md 文件夹。',
  'agentSettings.skills.fetchDialog.emptyHint': 'owner/repo、https URL 或 ssh URL 均可。',
  'agentSettings.skills.fetchDialog.submit.one': '安装 1 个 Skill',
  'agentSettings.skills.fetchDialog.submit.many': '安装 {count} 个 Skill',

  'agentSettings.memory.title': '记忆',
  'agentSettings.memory.empty': '尚无记录。',
  'agentSettings.memory.description':
    '当一次会话学到下次不必重新摸索的内容时，Agent 会在这里记录。运行 /refine 可让它回顾一段对话。',
  'agentSettings.memory.thisProject': '当前项目',
  'agentSettings.memory.everywhere': '所有位置',
  'agentSettings.memory.showInFinder': '在 Finder 中显示',

  'agentSettings.instructions.title': '指令',
  'agentSettings.systemPrompt.label': '系统提示词',
  'agentSettings.systemPrompt.description':
    '替换内置指令。工作文件夹仍会附加到末尾，因此 Agent 仍知道当前位置。',
  'agentSettings.systemPrompt.custom': '正在使用自定义提示词。',
  'agentSettings.systemPrompt.default': '正在使用默认提示词。',
  'agentSettings.systemPrompt.reset': '重置为默认值',
  'agentSettings.context.title': '上下文',
  'agentSettings.compaction.enabled.label': '自动压缩',
  'agentSettings.compaction.enabled.hint':
    '当对话占用达到模型上下文窗口的指定比例后，总结较早的消息。最近几轮会逐字保留。',
  'agentSettings.compaction.at': '压缩阈值',
  'agentSettings.compaction.percentFull': '已用 {percent}%',
  'agentSettings.maxToolRounds.enabled.label': '限制工具轮数',
  'agentSettings.maxToolRounds.enabled.hint':
    '工具调用达到指定轮数后停止本轮。关闭后会持续运行直到得到答案；被上限截断的一轮已经付出全部成本。',
  'agentSettings.maxToolRounds.stopAfter': '停止于',
  'agentSettings.maxToolRounds.rounds': '轮',

  'agentSettings.classifier.label': '自动批准备注',
  'agentSettings.classifier.description':
    '会追加到下方内置指令中，用于补充只有你知道的信息，例如一次性容器中可自由安装，或某文件夹中的脚本永远不能视为常规操作。',
  'agentSettings.classifier.placeholder':
    '例如：此仓库运行在一次性容器中，因此可以安装依赖。./deploy 下的任何操作都不能放行。',
  'agentSettings.classifier.custom': '你的备注会随请求发送。',
  'agentSettings.classifier.default': '仅使用内置指令。',
  'agentSettings.classifier.clear': '清除备注',
  'agentSettings.classifier.builtIn': '始终告知模型的内容',

  'agentSettings.toolSearch.title': '延迟加载工具',
  'agentSettings.toolSearch.description':
    '在 Agent 搜索之前，暂不提供已连接服务中的工具。工具仍可使用，只是稍后才告知 Agent，因此无需每轮支付完整工具说明的 Token 费用。',
  'agentSettings.toolSearch.enabled.label': '延迟加载服务工具',
  'agentSettings.toolSearch.maxResults.label': '每次搜索加载数量',
  'agentSettings.toolSearch.maxResults.hint':
    '一次搜索最多加载多少工具。数量少可保留节省效果；Agent 随时可以再次搜索。',
  'agentSettings.toolSearch.hint.noKey':
    '需要 OpenRouter API 密钥。搜索在 OpenRouter 运行，不在本机。',
  'agentSettings.toolSearch.hint.noServers':
    '暂无可延迟加载的工具。连接到“工具”中的服务后即可节省 Token。',
  'agentSettings.toolSearch.hint.oneServer':
    '延迟加载服务中的工具。首次需要某个工具时会花一轮查找，之后每一轮都会更省。',
  'agentSettings.toolSearch.hint.manyServers':
    '延迟加载 {count} 个服务中的工具。首次需要某个工具时会花一轮查找，之后每一轮都会更省。',

  'agentSettings.web.title': '网页',
  'agentSettings.web.description':
    '允许 Agent 通过 URL 读取页面，例如文档、变更日志或 Issue，并以 Markdown 返回。关闭后不会向它提供该工具。',
  'agentSettings.web.enabled.label': '读取网页',
  'agentSettings.web.enabled.hint':
    '需要 JavaScript 的页面会先在浏览器中运行，因此大多数文档站点都可读取。',
  'agentSettings.web.local.label': '允许本地地址',
  'agentSettings.web.local.hint':
    '允许读取本机的开发服务器或局域网中的其他地址。无论此项如何设置，云元数据地址始终会被拒绝。',
  'agentSettings.web.maxChars.label': '每页字符数',
  'agentSettings.web.maxChars.hint': '超出部分会被截断并附上说明。长页面通常大部分是导航。',
  'agentSettings.web.maxChars.resetTitle': '恢复为 {value}',
  'agentSettings.web.maxChars.resetAria': '重置每页字符数',

  'agentSettings.webSearch.title': '网页搜索',
  'agentSettings.webSearch.description':
    '当 Agent 不知道答案地址时，允许它搜索网页。搜索由 OpenRouter 执行，Fleet 会显示来源。',
  'agentSettings.webSearch.enabled.label': '搜索网页',
  'agentSettings.webSearch.enabled.hint':
    'OpenRouter 按搜索次数计费，读取结果产生的 Token 费用另计。',
  'agentSettings.webSearch.enabled.noKey':
    '需要 OpenRouter API 密钥。搜索在 OpenRouter 运行，不在本机。',
  'agentSettings.webSearch.engine.hint':
    'Exa 更可预测：无论选择哪个模型，价格和限制都一致。自动模式会优先使用模型自身的搜索能力，价格和限制也会随之变化。',
  'agentSettings.webSearch.maxResults.label': '每次搜索结果数',
  'agentSettings.webSearch.maxResults.hint': '每个结果都带有摘要，摘要会产生 Token 费用。',
  'agentSettings.webSearch.maxSearches.label': '每轮搜索次数',
  'agentSettings.webSearch.maxSearches.hint':
    '按轮而不是按回合计算：一个回合包含多轮，每次都会重新计算。下方的花费刹车限制整个回合。',
  'agentSettings.webSearch.spend.label': '花费刹车',
  'agentSettings.webSearch.spend.hint':
    '每轮搜索大约达到这些美元后，OpenRouter 会收尾。它会完成已开始的调用，因此最终账单可能略高。留空表示不刹车。',

  'agentSettings.hostedFetch.title': '托管网页读取器',
  'agentSettings.hostedFetch.description':
    '在 OpenRouter 上运行的第二种网页读取方式。适合公开 PDF，以及 Fleet 自有读取器无法提取的页面。它无法访问本机或本地网络。',
  'agentSettings.hostedFetch.enabled.label': '同时使用 OpenRouter 读取网页',
  'agentSettings.hostedFetch.enabled.hint':
    'Fleet 默认仍会自行读取网页。此项会为难以提取的公开页面增加第二个读取器。',
  'agentSettings.hostedFetch.enabled.noKey':
    '需要 OpenRouter API 密钥。抓取在 OpenRouter 运行，不在本机。',
  'agentSettings.hostedFetch.engine.hint':
    'OpenRouter 自带引擎是普通抓取且免费。Exa 和 Parallel 每 1,000 次抓取收费 $1，能更好地提取复杂页面。Firecrawl 会消耗你自己的额度。',
  'agentSettings.hostedFetch.maxFetches.label': '每轮抓取次数',
  'agentSettings.hostedFetch.maxFetches.hint':
    '按轮而不是按回合计算：一个回合包含多轮，每次都会重新计算。',
  'agentSettings.hostedFetch.blocked.label': '禁止读取',
  'agentSettings.hostedFetch.blocked.hint':
    '此读取器必须拒绝的主机，每行一个。无论下方是否设置允许列表都生效。',
  'agentSettings.hostedFetch.allowed.label': '仅允许读取',
  'agentSettings.hostedFetch.allowed.hint':
    '留空表示允许任何公开地址。填写后会拒绝其他所有主机，需要持续维护。',
  'agentSettings.hostedFetch.pageLength.label': '页面长度',
  'agentSettings.hostedFetch.pageLength.hint':
    '发送给模型的单页近似 Token 数。留空由引擎决定。过长页面会截断，不会拒绝。',
  'agentSettings.hostedFetch.pageLength.placeholder': '引擎决定',

  'agentSettings.catalog.loading': '正在加载模型…',
  'agentSettings.catalog.empty': '尚未加载模型。',
  'agentSettings.catalog.localOnly.one': '1 个本地模型。未下载 OpenRouter 模型。',
  'agentSettings.catalog.localOnly.many': '{count} 个本地模型。未下载 OpenRouter 模型。',
  'agentSettings.catalog.counts': '{count} 个 OpenRouter 模型和 {imageCount} 个图像模型',
  'agentSettings.catalog.updated': '{age}更新。',
  'agentSettings.catalog.local.one': '另外还有 1 个本地模型。',
  'agentSettings.catalog.local.many': '另外还有 {count} 个本地模型。',
  'agentSettings.catalog.refresh': '刷新',
  'agentSettings.catalog.error':
    '无法刷新 OpenRouter 模型列表（{error}）。当前显示上次下载的版本。',
  'agentSettings.catalog.localUnaffected': '本地模型不受影响。',
  'agentSettings.catalog.age.justNow': '刚刚',
  'agentSettings.catalog.age.minutes': '{count} 分钟前',
  'agentSettings.catalog.age.hours': '{count} 小时前',
  'agentSettings.catalog.age.days': '{count} 天前',

  'agentSettings.secret.saveError': '保存失败，请重试。',
  'agentSettings.secret.saved': '已保存',
  'agentSettings.secret.stored': '密钥已存储',
  'agentSettings.secret.encrypted': '已加密',
  'agentSettings.secret.replace': '替换',
  'agentSettings.secret.hide': '隐藏密钥',
  'agentSettings.secret.show': '显示密钥',
  'agentSettings.rowMenu.moreActions': '{label} 的更多操作'
};

<script lang="ts">
	import { getContext } from 'svelte';
	import { tools } from '$lib/stores';
	import Modal from '../common/Modal.svelte';
	import Switch from '../common/Switch.svelte';
	import { toast } from 'svelte-sonner';

	interface Tool {
		id: string;
		user_id: string;
		name: string;
		meta: {
			description: string | null;
			auth_completed: boolean;
			auth_url: string;
			manifest: Record<string, unknown>;
		};
		access_control: unknown;
		updated_at: number;
		created_at: number;
		user: unknown;
		enabled?: boolean;
	}

	export let show = false;

	const i18n = getContext('i18n');

	const handleConnect = (authUrl: string) => {
		if (authUrl) {
			window.open(authUrl, '_blank');
		}
	};

	const updateToolAuth = async (tool: Tool, enabled: boolean) => {
		try {
			const response = await fetch(`/api/v1/tools/id/${tool.id}/update`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: tool.id,
					name: tool.name,
					content: '',
					meta: {
						...tool.meta,
						auth_completed: enabled
					},
					access_control: tool.access_control || {}
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update tool auth status');
			}

			// 성공적으로 업데이트된 경우 tools 스토어를 업데이트
			tools.update((currentTools: Tool[] | null) => {
				if (!currentTools) return [];
				return currentTools.map((currentTool: Tool) => {
					if (currentTool.id === tool.id) {
						return {
							...currentTool,
							meta: {
								...currentTool.meta,
								auth_completed: enabled
							}
						};
					}
					return currentTool;
				});
			});
		} catch (error) {
			console.error('Error updating tool auth:', error);
			toast.error($i18n.t('Failed to update tool authorization'));
		}
	};

	const handleSwitchChange = (tool: Tool, enabled: boolean) => {
		updateToolAuth(tool, enabled);
	};

	$: toolsList = ($tools || []).map((tool: Tool) => ({
		...tool,
		enabled: tool.meta.auth_completed
	}));
</script>

<Modal bind:show size="md">
	
	<div>
		<div class=" flex justify-between dark:text-gray-300 px-5 pt-4 pb-0.5">
			<div class=" text-lg font-medium self-center">{$i18n.t('Tools List')}</div>
			<button
				class="self-center"
				on:click={() => {
					show = false;
				}}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="w-5 h-5"
				>
					<path
						d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
					/>
				</svg>
			</button>
		</div>
	</div>

	<div class="px-5 py-4 space-y-4 dark:text-gray-300">
		{#each toolsList as tool}
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="text-sm">{tool.name}</span>
				</div>
				{#if tool.meta.auth_completed}
					<Switch bind:state={tool.enabled} on:change={(e) => handleSwitchChange(tool, e.detail)} />
				{:else}
					<button
						class="text-xs px-3 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 transition rounded-lg font-medium"
						type="button"
						on:click={() => handleConnect(tool.meta.auth_url)}
					>
						<span class="flex items-center gap-1">
							<span>Connect</span>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
								<path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clip-rule="evenodd" />
								<path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clip-rule="evenodd" />
							</svg>
						</span>
					</button>
				{/if}
			</div>
		{/each}
	</div>
</Modal>

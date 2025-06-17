<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { getArcadeTools, setArcadeTools } from '$lib/apis/configs';
	import { toast } from 'svelte-sonner';
	import Switch from '$lib/components/common/Switch.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	const i18n: any = getContext('i18n');

	interface Tool {
		name: string;
		description: string;
		enabled: boolean;
	}

	interface Toolkit {
		toolkit: string;
		description: string | null;
		enabled: boolean;
		tools: Tool[];
	}

	let tools: Toolkit[] | null = null;

	const updateHandler = async () => {
		if (!tools) return;

		const res = await setArcadeTools(localStorage.token, { ARCADE_TOOLS_CONFIG: tools });
		if (res) {
			toast.success($i18n.t('Connections saved successfully'));
		}
	};

	const toggleTool = (toolkit: string, toolName: string) => {
		if (!tools) return;

		tools = tools.map((t) => {
			if (t.toolkit === toolkit) {
				t.tools = t.tools.map((tool) => {
					if (tool.name === toolName) {
						tool.enabled = !tool.enabled;
					}
					return tool;
				});
			}
			return t;
		});
	};

	onMount(async () => {
		const res = await getArcadeTools(localStorage.token);
		tools = res.ARCADE_TOOLS_CONFIG;
	});
</script>

<form
	class="flex flex-col h-full justify-between text-sm"
	on:submit|preventDefault={() => {
		updateHandler();
	}}
>
	<div class="overflow-y-scroll scrollbar-hidden h-full">
		{#if tools !== null}
			<div class="mb-8">
				<h2 class="text-2xl font-bold mb-4">
					{$i18n.t('Tool Manager')}
				</h2>
				<div class="space-y-2">
						{#each tools as tool}
							<div
								class="flex items-center justify-between px-5 py-2 bg-gray-50 dark:text-gray-300 dark:bg-gray-850 rounded-lg shadow"
							>
								<div class="flex-1">
									<div class="text-lg">{tool.toolkit}</div>
								</div>
								<Switch bind:state={tool.enabled} />
							</div>
						{/each}
					</div>
				</div>
		{:else}
			<div class="flex h-full justify-center">
				<div class="my-auto">
					<Spinner className="size-6" />
				</div>
			</div>
		{/if}
		<div class="flex justify-end pt-3 text-sm font-medium gap-2">
			<button
				type="submit"
				class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
			>
				{$i18n.t('Save')}
			</button>
		</div>
	</div>

	
</form>

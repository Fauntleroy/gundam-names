<script>
	import { fly } from 'svelte/transition';
	import { expoIn, expoOut } from 'svelte/easing';

	import GundamNames from '../dist/index.js' // 'gundam-names'
	
	import ArrowLoop from './icons/arrow-loop.svg';

	let name = GundamNames.generateName();

	function hangleRegenClick () {
		name = null;
		setTimeout(() => { name = GundamNames.generateName(); }, 1000);
	}
</script>

<main>
	<section class="name-app">
		<h1>
			<small>Hello,</small>
			{#key name}
				{#if name}
					{#each name.split(' ') as nameSegment, i}
						{#if nameSegment}
							<div
								in:fly={{ x: 25, duration: 200, easing: expoOut, delay: i * 100 }}
								out:fly={{ x: 25, duration: 500, easing: expoIn, delay: i * 100 }}>
								{nameSegment}
							</div>
						{/if}
					{/each}
				{/if}
			{/key}
		</h1>
		<button class="regen" on:click={hangleRegenClick}><ArrowLoop /></button>
	</section>
</main>

<style>
	main {
		width: 100%;
		height: 100%;
		padding: 1em;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #111833;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4rem;
		font-weight: 700;
		letter-spacing: 0.05rem;
		height: 15rem;
	}

	h1 small {
		font-size: 1.5rem;
		font-weight: 500;
	}

	.name-app {
		width: 640px;
		max-width: 100%;
	}

	.regen {
		text-transform: uppercase;
		font-weight: 500;
		letter-spacing: 0.1rem;
		font-size: 1.1rem;
	}
</style>
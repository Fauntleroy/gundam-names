<script>
	import GundamNames from '../dist/index.js' // 'gundam-names'

	const name = GundamNames.generateName();
</script>

<main>
	<h1><small>Hello,</small><br />{name}</h1>
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
	}

	h1 small {
		font-size: 1.5rem;
		font-weight: 500;
	}
</style>
// deploy-factory.js
require('dotenv').config({ path: 'apps/api/.env' })

const { deployFactory } = require('./apps/api/src/services/deployer/bscDeployer')

console.log('Deploying factory to BSC mainnet...')
console.log('Platform wallet:', process.env.PLATFORM_WALLET_ADDRESS)

deployFactory('mainnet')
  .then(addr => {
    console.log('SUCCESS — Factory deployed at:', addr)
    console.log('Add this to Render env: BSC_MAINNET_FACTORY_ADDRESS=' + addr)
  })
  .catch(err => {
    console.error('FAILED:', err.message)
  })
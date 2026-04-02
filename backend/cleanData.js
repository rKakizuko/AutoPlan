const mongoose = require('mongoose');
require('dotenv').config();

const Protocol = require('./models/Protocol');

const cleanDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    const deletedProtocols = await Protocol.deleteMany({});
    console.log(`✓ ${deletedProtocols.deletedCount} protocolos deletados`);

    console.log('\n✓ Banco de dados limpo com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    process.exit(1);
  }
};

cleanDatabase();

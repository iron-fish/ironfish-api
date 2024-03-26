/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* eslint-disable no-console */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAsset({
  blockHash,
  transactionHash,
  identifier,
  name,
  metadata,
  owner,
  supply,
  verified_metadata,
}: {
  blockHash: string;
  transactionHash: string;
  identifier: string;
  name: string;
  metadata: string;
  owner: string;
  supply: number | bigint;
  verified_metadata?: {
    symbol: string;
    decimals?: number;
    logo_uri?: string;
    website?: string;
  };
}) {
  const transaction = await prisma.transaction.upsert({
    where: {
      uq_transactions_on_hash_and_network_version: {
        hash: transactionHash,
        network_version: 1,
      },
    },
    update: {},
    create: {
      hash: transactionHash,
      fee: 0.0,
      size: 500,
      notes: {},
      spends: {},
      network_version: 1,
    },
  });

  const block = await prisma.block.upsert({
    where: {
      uq_blocks_on_hash_and_network_version: {
        hash: blockHash,
        network_version: 1,
      },
    },
    update: {},
    create: {
      hash: blockHash,
      sequence: 0,
      previous_block_hash:
        '0000000000000000000000000000000000000000000000000000000000000000',
      main: true,
      network_version: 1,
      transactions_count: 1,
      timestamp: new Date(),
      graffiti: '...',
    },
  });

  await prisma.blockTransaction.upsert({
    where: {
      block_id_transaction_id: {
        block_id: block.id,
        transaction_id: transaction.id,
      },
    },
    update: {},
    create: {
      block: { connect: { id: block.id } },
      transaction: { connect: { id: transaction.id } },
    },
  });

  const verifiedMetadataCreate = verified_metadata
    ? {
        verified_metadata: {
          create: verified_metadata,
        },
      }
    : {};

  await prisma.asset.upsert({
    where: { identifier: identifier },
    update: {},
    create: {
      identifier: identifier,
      metadata: metadata,
      name: name,
      owner: owner,
      supply: supply,
      ...verifiedMetadataCreate,
      created_transaction: {
        connect: { id: transaction.id },
      },
    },
  });

  console.log(`Created asset ${name}`);
}

async function addVerifiedAssetMetadata({
  identifier,
  symbol,
  decimals,
  logoURI,
  website,
}: {
  identifier: string;
  symbol: string;
  decimals?: number;
  logoURI?: string;
  website?: string;
}) {
  await prisma.verifiedAssetMetadata.upsert({
    where: { identifier: identifier },
    update: {},
    create: {
      identifier: identifier,
      symbol: symbol,
      decimals: decimals,
      logo_uri: logoURI,
      website: website,
    },
  });
}

async function installTestingFixtures() {
  await addAsset({
    blockHash:
      '0000000000000000000000000000000000000000000000000000000000000000',
    transactionHash:
      '4f484a5355a65be2179fc66d69e149788e78aec35c6db230b182264e3982bc15',
    identifier:
      '51f33a2f14f92735e562dc658a5639279ddca3d5079a6d1242b2a588a9cbf44c',
    name: '$IRON',
    metadata: 'Iron Fish Native Asset',
    owner: '0000000000000000000000000000000000000000000000000000000000000000',
    supply: BigInt(5000000000),
    verified_metadata: {
      symbol: 'IRON',
      decimals: 8,
      logo_uri: 'https://ironfish.network/favicon.ico',
      website: 'https://ironfish.network/',
    },
  });

  const copperIdentifier =
    '571de66a31fcc61a6a306030d3946489596a40a4f0bfde57643d41281a385d9b';

  await addAsset({
    blockHash:
      '913050766c146a04cc82200816b23cd22f0e8d5751eb00cc837dc532ef7d8dd0',
    transactionHash:
      'f21561e7d67411919784dc0c7a3a37c2905f910214ba2e47f5074efa0a426f6a',
    identifier: copperIdentifier,
    name: '$COPPER',
    metadata: 'Copper',
    owner: 'f7cdb1bf17b3c559c855767e22d74b6ce20a49864190496cbf739c4312693fe7',
    supply: 123456789,
  });

  await addVerifiedAssetMetadata({
    identifier: copperIdentifier,
    symbol: '$COPPER',
  });

  const nickelIdentifier =
    '40dc9626167399480f400120fc476d2697a461a68dec29f69fe08aaaf4fbfa70';

  await addAsset({
    blockHash:
      'ba6998750cc990836fe8fa4364cda105a6cb81a6cf1b486df0c1190f58e9879f',
    transactionHash:
      '8dadd7846b21980da791b3f176307330e60ca223b4085e2c81f913ad65a818ac',
    identifier: nickelIdentifier,
    name: '$NICKEL',
    metadata: 'Nickel',
    owner: '04efe4bcc818f0d11aa49ea83f5cec0c137ce61b38a4d2492558ebba06b7a3ed',
    supply: 123456789,
  });

  await addVerifiedAssetMetadata({
    identifier: nickelIdentifier,
    symbol: '$NCKL',
    decimals: 2,
  });

  const zincIdentifier =
    '3b43e71e5d6aa94eb29d3f0f08282c3581336daea61b39e165bab184e0debe8a';

  await addAsset({
    blockHash:
      '4343c35647b5de528de535e92cdadcab3822f9a3a33d88efe840136279edf062',
    transactionHash:
      'e6559eab465bf3d401a61ecf2d729e5051e426365db2435a0871bb4b8b0d35dd',
    identifier: zincIdentifier,
    name: '$ZINC',
    metadata: 'Zinc',
    owner: '29cb8a1f1f4521eded69d2aadd07eeddf630326cce964210078bc3d17de268d6',
    supply: 123456789,
  });

  await addVerifiedAssetMetadata({
    identifier: zincIdentifier,
    symbol: '$ZINC',
    decimals: 2,
    logoURI: 'https://example.com/foo.jpg',
    website: 'https://example.com',
  });
}

async function main() {
  const environment = process.env.SEED_TYPE;

  switch (environment) {
    case 'testing':
      await installTestingFixtures();
      break;
    case undefined:
      // The seed code will be executed automatically when running `prisma
      // migrate`, hence don't print anything if SEED_TYPE is not specified, to
      // avoid polluting the migration output
      break;
    default:
      console.error(`unknown value for SEED_TYPE: ${environment}`);
      break;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

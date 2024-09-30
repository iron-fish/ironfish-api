/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import Joi from 'joi';
import { URL } from 'node:url';
import { catchError, firstValueFrom } from 'rxjs';
import { ApiConfigService } from '../api-config/api-config.service';
import { LoggerService } from '../logger/logger.service';

export type ChainportNetwork = {
  chainport_network_id: number;
  explorer_url: string;
  label: string;
  network_icon: string;
};

const chainportNetworkSchema = Joi.object<ChainportNetwork>({
  chainport_network_id: Joi.number().positive().integer().required(),
  explorer_url: Joi.string().required(),
  label: Joi.string().required(),
  network_icon: Joi.string().required(),
});

const chainportNetworkArraySchema = Joi.array<ChainportNetwork[]>().items(
  chainportNetworkSchema,
);

/**
 * Intersection of V1 and V2 token responses.
 */
export type ChainportToken = {
  id: number;
  decimals: number;
  name: string;
  pinned: boolean;
  web3_address: string;
  symbol: string;
  token_image: string;
  chain_id: number | null;
  network_name: string;
  network_id: number;
  blockchain_type: string;
  is_stable: boolean;
  is_lifi: boolean;
};

const chainportTokenSchema = Joi.object<ChainportToken>({
  id: Joi.number().required(),
  decimals: Joi.number().required(),
  name: Joi.string().required(),
  pinned: Joi.boolean().required(),
  web3_address: Joi.string().required(),
  symbol: Joi.string().required(),
  token_image: Joi.string().required(),
  chain_id: Joi.number().allow(null).required(),
  network_name: Joi.string().required(),
  network_id: Joi.number().required(),
  blockchain_type: Joi.string().required(),
  is_stable: Joi.boolean().required(),
  is_lifi: Joi.boolean().required(),
});

const chainportTokenArraySchema =
  Joi.array<ChainportToken[]>().items(chainportTokenSchema);

type ChainportTokenListResponse = {
  verified_tokens: ChainportToken[];
};

export type ChainportIronFishMetadata = {
  bridge_output: {
    publicAddress: string;
    amount: string;
    memoHex: string;
    assetId: string;
  };
  gas_fee_output: {
    publicAddress: string;
    amount: string;
    memo: string;
  };
  bridge_fee: {
    source_token_fee_amount: string;
    portx_fee_amount: string;
    is_portx_fee_payment: boolean;
  };
};

const chainportIronFishMetadataSchema = Joi.object<ChainportIronFishMetadata>({
  bridge_output: Joi.object({
    publicAddress: Joi.string().required(),
    amount: Joi.string().required(),
    memoHex: Joi.string().required(),
    assetId: Joi.string().required(),
  }).required(),
  gas_fee_output: Joi.object({
    publicAddress: Joi.string().required(),
    amount: Joi.string().required(),
    memo: Joi.string().required(),
  }).required(),
  bridge_fee: Joi.object({
    source_token_fee_amount: Joi.string().required(),
    portx_fee_amount: Joi.string().required(),
    is_portx_fee_payment: Joi.boolean().required(),
  }).required(),
});

export type ChainportPort =
  | Record<string, never>
  | {
      base_network_id: number | null;
      base_tx_hash: string | null;
      base_tx_status: number | null;
      base_token_address: string | null;
      target_network_id: number | null;
      target_tx_hash: string | null;
      target_tx_status: number | null;
      target_token_address: string | null;
      created_at: string | null;
      port_in_ack: boolean | null;
    };

@Injectable()
export class ChainportService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {}

  private makeChainportRequest<T>(
    url: string,
  ): Promise<AxiosResponse<T, unknown>> {
    return firstValueFrom(
      this.httpService.get<T>(url).pipe(
        catchError((e: AxiosError) => {
          this.logger.error(
            `Chainport Error: ${url} - Status Code ${
              e.status ?? 'Unknown'
            } - ${JSON.stringify(e.response?.data)}`,
            e.stack ?? '',
          );
          throw new BadGatewayException(e);
        }),
      ),
    );
  }

  private async getMeta(): Promise<{
    maintenance: boolean;
    cp_network_ids: Record<string, ChainportNetwork>;
  }> {
    const version = this.config.get<number>('CHAINPORT_API_VERSION');
    const apiurl = this.config.get<string>('CHAINPORT_API_URL');

    const url = new URL(`/meta`, apiurl);
    if (version > 1) {
      url.searchParams.append('non_abi', 'true');
    }

    const result = await this.makeChainportRequest<{
      maintenance: boolean;
      cp_network_ids: Record<string, ChainportNetwork>;
    }>(url.toString());

    return result.data;
  }

  async getNetworks(): Promise<ChainportNetwork[]> {
    const meta = await this.getMeta();

    const validateResult = chainportNetworkArraySchema.validate(
      Object.values(meta.cp_network_ids),
      {
        stripUnknown: true,
      },
    );

    if (validateResult.error) {
      throw new BadGatewayException(
        `Invalid Chainport response: ${validateResult.error.message}`,
      );
    }

    return validateResult.value;
  }

  async getVerifiedTokens(): Promise<ChainportToken[]> {
    const version = this.config.get<number>('CHAINPORT_API_VERSION');
    const apiurl = this.config.get<string>('CHAINPORT_API_URL');
    const url = new URL(`/token/list`, apiurl);

    if (version === 1) {
      url.searchParams.append('network_name', 'IRONFISH');
    } else {
      const networkId = this.config.get<string>('CHAINPORT_NETWORK_ID');
      url.searchParams.append('network_id', networkId);
    }

    const result = await this.makeChainportRequest<ChainportTokenListResponse>(
      url.toString(),
    );

    const validateResult = chainportTokenArraySchema.validate(
      result.data.verified_tokens,
      {
        stripUnknown: true,
      },
    );

    if (validateResult.error) {
      throw new BadGatewayException(
        `Invalid Chainport response: ${validateResult.error.message}`,
      );
    }
    return validateResult.value;
  }

  async getTokenPaths(tokenId: number): Promise<ChainportNetwork[]> {
    const version = this.config.get<number>('CHAINPORT_API_VERSION');
    const apiurl = this.config.get<string>('CHAINPORT_API_URL');

    const metaResult = await this.getMeta();

    let networkList: { label: string }[] = [];
    if (version === 1) {
      const tokenListUrl = new URL(`/token/list`, apiurl);
      tokenListUrl.searchParams.append('network_name', 'IRONFISH');

      const tokenListResult = await this.makeChainportRequest<{
        verified_tokens: { id: number; target_networks: number[] }[];
      }>(tokenListUrl.toString());
      const sourceToken = tokenListResult.data.verified_tokens.find(
        (t) => t.id === tokenId,
      );

      if (!sourceToken) {
        throw new NotFoundException();
      }

      networkList = sourceToken.target_networks.flatMap((n) => {
        const network = metaResult.cp_network_ids[n.toString()];
        if (!network) {
          this.logger.error(
            `Network ${n} for token ${tokenId} not found in meta`,
            new Error().stack ?? '',
          );
          return [];
        }
        return [network];
      });
    } else {
      const tokenPathUrl = new URL(`/token/paths`, apiurl);

      tokenPathUrl.searchParams.append('token_id', tokenId.toString());
      const tokenPathResult = await this.makeChainportRequest<ChainportToken[]>(
        tokenPathUrl.toString(),
      );

      networkList = tokenPathResult.data.flatMap((t) => {
        const network = metaResult.cp_network_ids[t.network_id.toString()];
        if (!network) {
          this.logger.error(
            `Network ${t.network_id} for token ${tokenId} not found in meta`,
            new Error().stack ?? '',
          );
          return [];
        }
        return [network];
      });
    }

    const validateResult = chainportNetworkArraySchema.validate(networkList, {
      stripUnknown: true,
    });

    if (validateResult.error) {
      throw new BadGatewayException(
        `Invalid Chainport response: ${validateResult.error.message}`,
      );
    }
    return validateResult.value;
  }

  async getIronFishMetadata(
    amount: bigint,
    assetId: string,
    targetNetworkId: number,
    targetWeb3Address: string,
  ): Promise<ChainportIronFishMetadata> {
    const apiurl = this.config.get<string>('CHAINPORT_API_URL');

    const ironfishMetadataUrl = new URL(`/ironfish/metadata`, apiurl);
    ironfishMetadataUrl.searchParams.append('raw_amount', amount.toString());
    ironfishMetadataUrl.searchParams.append('asset_id', assetId);
    ironfishMetadataUrl.searchParams.append(
      'target_network_id',
      targetNetworkId.toString(),
    );
    ironfishMetadataUrl.searchParams.append(
      'target_web3_address',
      targetWeb3Address,
    );

    const ironfishMetadataResult =
      await this.makeChainportRequest<ChainportIronFishMetadata>(
        ironfishMetadataUrl.toString(),
      );

    const validateResult = chainportIronFishMetadataSchema.validate(
      ironfishMetadataResult.data,
      {
        stripUnknown: true,
      },
    );

    if (validateResult.error) {
      throw new BadGatewayException(
        `Invalid Chainport response: ${validateResult.error.message}`,
      );
    }

    return validateResult.value;
  }

  /**
   * Returns a port transaction
   *
   * https://docs.chainport.io/for-developers/api-reference/port
   */
  async getPort(
    baseTxHash: string,
    baseNetworkId: number,
  ): Promise<ChainportPort> {
    const apiurl = this.config.get<string>('CHAINPORT_API_URL');

    const portUrl = new URL(`/api/port`, apiurl);
    portUrl.searchParams.append('base_tx_hash', baseTxHash.toString());
    portUrl.searchParams.append('base_network_id', baseNetworkId.toString());

    const portResult = await this.makeChainportRequest<ChainportPort>(
      portUrl.toString(),
    );

    return portResult.data;
  }
}
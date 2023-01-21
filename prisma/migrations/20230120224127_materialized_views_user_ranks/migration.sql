CREATE MATERIALIZED VIEW block_mined_user_ranks AS (WITH user_latest_events AS
                                                      (SELECT user_id,
                                                              block_mined_points AS total_points,
                                                              block_mined_count AS total_counts,
                                                              block_mined_last_occurred_at AS latest_event_occurred_at
                                                       FROM user_points),
                                                         user_ranks AS
                                                      (SELECT id,
                                                              graffiti,
                                                              total_points,
                                                              latest_event_occurred_at,
                                                              country_code,
                                                              created_at,
                                                              total_counts,
                                                              RANK () OVER (
                                                                            ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                       FROM users
                                                       INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                    SELECT id,
                                                           graffiti,
                                                           total_points,
                                                           total_counts,
                                                           latest_event_occurred_at,
                                                           country_code,
                                                           created_at,
                                                           rank,
                                                           now() refresh_time
                                                    FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW bug_caught_user_ranks AS (WITH user_latest_events AS
                                                     (SELECT user_id,
                                                             bug_caught_points AS total_points,
                                                             bug_caught_count AS total_counts,
                                                             bug_caught_last_occurred_at AS latest_event_occurred_at
                                                      FROM user_points),
                                                        user_ranks AS
                                                     (SELECT id,
                                                             graffiti,
                                                             total_points,
                                                             latest_event_occurred_at,
                                                             country_code,
                                                             created_at,
                                                             total_counts,
                                                             RANK () OVER (
                                                                           ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                      FROM users
                                                      INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                   SELECT id,
                                                          graffiti,
                                                          total_points,
                                                          total_counts,
                                                          latest_event_occurred_at,
                                                          country_code,
                                                          created_at,
                                                          rank,
                                                          now() refresh_time
                                                   FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW community_contribution_user_ranks AS (WITH user_latest_events AS
                                                                 (SELECT user_id,
                                                                         community_contribution_points AS total_points,
                                                                         community_contribution_count AS total_counts,
                                                                         community_contribution_last_occurred_at AS latest_event_occurred_at
                                                                  FROM user_points),
                                                                    user_ranks AS
                                                                 (SELECT id,
                                                                         graffiti,
                                                                         total_points,
                                                                         latest_event_occurred_at,
                                                                         country_code,
                                                                         created_at,
                                                                         total_counts,
                                                                         RANK () OVER (
                                                                                       ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                                  FROM users
                                                                  INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                               SELECT id,
                                                                      graffiti,
                                                                      total_points,
                                                                      total_counts,
                                                                      latest_event_occurred_at,
                                                                      country_code,
                                                                      created_at,
                                                                      rank,
                                                                      now() refresh_time
                                                               FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW pull_request_merged_user_ranks AS (WITH user_latest_events AS
                                                              (SELECT user_id,
                                                                      pull_request_merged_points AS total_points,
                                                                      pull_request_merged_count AS total_counts,
                                                                      pull_request_merged_last_occurred_at AS latest_event_occurred_at
                                                               FROM user_points),
                                                                 user_ranks AS
                                                              (SELECT id,
                                                                      graffiti,
                                                                      total_points,
                                                                      latest_event_occurred_at,
                                                                      country_code,
                                                                      created_at,
                                                                      total_counts,
                                                                      RANK () OVER (
                                                                                    ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                               FROM users
                                                               INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                            SELECT id,
                                                                   graffiti,
                                                                   total_points,
                                                                   total_counts,
                                                                   latest_event_occurred_at,
                                                                   country_code,
                                                                   created_at,
                                                                   rank,
                                                                   now() refresh_time
                                                            FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW social_media_promotion_user_ranks AS (WITH user_latest_events AS
                                                                 (SELECT user_id,
                                                                         social_media_promotion_points AS total_points,
                                                                         social_media_promotion_count AS total_counts,
                                                                         social_media_promotion_last_occurred_at AS latest_event_occurred_at
                                                                  FROM user_points),
                                                                    user_ranks AS
                                                                 (SELECT id,
                                                                         graffiti,
                                                                         total_points,
                                                                         latest_event_occurred_at,
                                                                         country_code,
                                                                         created_at,
                                                                         total_counts,
                                                                         RANK () OVER (
                                                                                       ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                                  FROM users
                                                                  INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                               SELECT id,
                                                                      graffiti,
                                                                      total_points,
                                                                      total_counts,
                                                                      latest_event_occurred_at,
                                                                      country_code,
                                                                      created_at,
                                                                      rank,
                                                                      now() refresh_time
                                                               FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW node_uptime_user_ranks AS (WITH user_latest_events AS
                                                      (SELECT user_id,
                                                              node_uptime_points AS total_points,
                                                              node_uptime_count AS total_counts,
                                                              node_uptime_last_occurred_at AS latest_event_occurred_at
                                                       FROM user_points),
                                                         user_ranks AS
                                                      (SELECT id,
                                                              graffiti,
                                                              total_points,
                                                              latest_event_occurred_at,
                                                              country_code,
                                                              created_at,
                                                              total_counts,
                                                              RANK () OVER (
                                                                            ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                       FROM users
                                                       INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                    SELECT id,
                                                           graffiti,
                                                           total_points,
                                                           total_counts latest_event_occurred_at,
                                                                        country_code,
                                                                        created_at,
                                                                        rank,
                                                                        now() refresh_time
                                                    FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW send_transaction_user_ranks AS (WITH user_latest_events AS
                                                           (SELECT user_id,
                                                                   send_transaction_points AS total_points,
                                                                   send_transaction_count AS total_counts,
                                                                   send_transaction_last_occurred_at AS latest_event_occurred_at
                                                            FROM user_points),
                                                              user_ranks AS
                                                           (SELECT id,
                                                                   graffiti,
                                                                   total_points,
                                                                   latest_event_occurred_at,
                                                                   country_code,
                                                                   created_at,
                                                                   total_counts,
                                                                   RANK () OVER (
                                                                                 ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                            FROM users
                                                            INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                         SELECT id,
                                                                graffiti,
                                                                total_points,
                                                                total_counts,
                                                                latest_event_occurred_at,
                                                                country_code,
                                                                created_at,
                                                                rank,
                                                                now() refresh_time
                                                         FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW multi_asset_transfer_user_ranks AS (WITH user_latest_events AS
                                                               (SELECT user_id,
                                                                       multi_asset_transfer_points AS total_points,
                                                                       multi_asset_transfer_count AS total_counts,
                                                                       multi_asset_transfer_last_occurred_at AS latest_event_occurred_at
                                                                FROM user_points),
                                                                  user_ranks AS
                                                               (SELECT id,
                                                                       graffiti,
                                                                       total_points,
                                                                       latest_event_occurred_at,
                                                                       country_code,
                                                                       created_at,
                                                                       total_counts,
                                                                       RANK () OVER (
                                                                                     ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                                FROM users
                                                                INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                             SELECT id,
                                                                    graffiti,
                                                                    total_points,
                                                                    total_counts,
                                                                    latest_event_occurred_at,
                                                                    country_code,
                                                                    created_at,
                                                                    rank,
                                                                    now() refresh_time
                                                             FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW multi_asset_burn_user_ranks AS (WITH user_latest_events AS
                                                           (SELECT user_id,
                                                                   multi_asset_burn_points AS total_points,
                                                                   multi_asset_burn_count AS total_counts,
                                                                   multi_asset_burn_last_occurred_at AS latest_event_occurred_at
                                                            FROM user_points),
                                                              user_ranks AS
                                                           (SELECT id,
                                                                   graffiti,
                                                                   total_points,
                                                                   latest_event_occurred_at,
                                                                   country_code,
                                                                   created_at,
                                                                   total_counts,
                                                                   RANK () OVER (
                                                                                 ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                            FROM users
                                                            INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                         SELECT id,
                                                                graffiti,
                                                                total_points,
                                                                total_counts,
                                                                latest_event_occurred_at,
                                                                country_code,
                                                                created_at,
                                                                rank,
                                                                now() refresh_time
                                                         FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW multi_asset_mint_user_ranks AS (WITH user_latest_events AS
                                                           (SELECT user_id,
                                                                   multi_asset_mint_points AS total_points,
                                                                   multi_asset_mint_count AS total_counts,
                                                                   multi_asset_mint_last_occurred_at AS latest_event_occurred_at
                                                            FROM user_points),
                                                              user_ranks AS
                                                           (SELECT id,
                                                                   graffiti,
                                                                   total_points,
                                                                   latest_event_occurred_at,
                                                                   country_code,
                                                                   created_at,
                                                                   total_counts,
                                                                   RANK () OVER (
                                                                                 ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                            FROM users
                                                            INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                         SELECT id,
                                                                graffiti,
                                                                total_points,
                                                                total_counts,
                                                                latest_event_occurred_at,
                                                                country_code,
                                                                created_at,
                                                                rank,
                                                                now() refresh_time
                                                         FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW pool4_user_ranks AS (WITH user_latest_events AS
                                                (SELECT user_id,
                                                        pool4_points AS total_points,
                                                        pool4_count AS total_counts,
                                                        pool4_last_occurred_at AS latest_event_occurred_at
                                                 FROM user_points),
                                                   user_ranks AS
                                                (SELECT id,
                                                        graffiti,
                                                        total_points,
                                                        latest_event_occurred_at,
                                                        country_code,
                                                        created_at,
                                                        total_counts,
                                                        RANK () OVER (
                                                                      ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                 FROM users
                                                 INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                              SELECT id,
                                                     graffiti,
                                                     total_points,
                                                     total_counts,
                                                     latest_event_occurred_at,
                                                     country_code,
                                                     created_at,
                                                     rank,
                                                     now() refresh_time
                                              FROM user_ranks WHERE total_points != 0);


CREATE MATERIALIZED VIEW total_points_user_ranks AS (WITH user_latest_events AS
                                                       (SELECT user_id,
                                                               total_points,
                                                               block_mined_count + bug_caught_count + community_contribution_count + node_uptime_count + pull_request_merged_count + send_transaction_count + social_media_promotion_count + pool4_count AS total_counts,
                                                               GREATEST(block_mined_last_occurred_at, bug_caught_last_occurred_at, community_contribution_last_occurred_at, node_uptime_last_occurred_at, pull_request_merged_last_occurred_at, send_transaction_last_occurred_at, social_media_promotion_last_occurred_at, pool4_last_occurred_at) AS latest_event_occurred_at
                                                        FROM user_points),
                                                          user_ranks AS
                                                       (SELECT id,
                                                               graffiti,
                                                               total_points,
                                                               latest_event_occurred_at,
                                                               country_code,
                                                               created_at,
                                                               total_counts,
                                                               RANK () OVER (
                                                                             ORDER BY total_points DESC, COALESCE(latest_event_occurred_at, NOW()) ASC, created_at ASC) AS rank
                                                        FROM users
                                                        INNER JOIN user_latest_events ON user_latest_events.user_id = users.id)
                                                     SELECT id,
                                                            graffiti,
                                                            total_points,
                                                            total_counts,
                                                            latest_event_occurred_at,
                                                            country_code,
                                                            created_at,
                                                            rank,
                                                            now() refresh_time
                                                     FROM user_ranks WHERE total_points != 0);

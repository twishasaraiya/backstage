/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Entity, LocationSpec } from '@backstage/catalog-model';
import {
  Table,
  TableColumn,
  TableProps,
  useApi,
  configApiRef,
} from '@backstage/core';
import { Link } from '@material-ui/core';
import Edit from '@material-ui/icons/Edit';
import GitHub from '@material-ui/icons/GitHub';
import Add from '@material-ui/icons/Add';
import { Alert } from '@material-ui/lab';
import React, { useState, useEffect } from 'react';
import { generatePath, Link as RouterLink } from 'react-router-dom';
import { findLocationForEntityMeta } from '../../data/utils';
import { useStarredEntities } from '../../hooks/useStarredEntites';
import { entityRoute } from '../../routes';
import {
  favouriteEntityIcon,
  favouriteEntityTooltip,
} from '../FavouriteEntity/FavouriteEntity';
import { catalogApiRef } from '../../api/types';

const columns: TableColumn<Entity>[] = [
  {
    title: 'Name',
    field: 'metadata.name',
    highlight: true,
    render: (entity: any) => (
      <Link
        component={RouterLink}
        to={generatePath(entityRoute.path, {
          optionalNamespaceAndName: [
            entity.metadata.namespace,
            entity.metadata.name,
          ]
            .filter(Boolean)
            .join(':'),
          kind: entity.kind,
        })}
      >
        {entity.metadata.name}
      </Link>
    ),
  },
  {
    title: 'Owner',
    field: 'spec.owner',
  },
  {
    title: 'Lifecycle',
    field: 'spec.lifecycle',
  },
  {
    title: 'Description',
    field: 'metadata.description',
  },
];

type CatalogTableProps = {
  entities: Entity[];
  titlePreamble: string;
  loading: boolean;
  error?: any;
};

export const CatalogTable = ({
  entities,
  loading,
  error,
  titlePreamble,
}: CatalogTableProps) => {
  const { isStarredEntity, toggleStarredEntity } = useStarredEntities();
  const configApi = useApi(configApiRef);
  const catalogApi = useApi(catalogApiRef);

  const [entitiesState, setEntitiesState] = useState<Entity[]>([]);
  const [errorState, setError] = useState<Error | undefined>();

  useEffect(() => {
    setError(error);
    setEntitiesState(entities);
  }, [error, entities]);
  if (errorState) {
    return (
      <div>
        <Alert severity="error">
          Error encountered while fetching catalog entities.{' '}
          {errorState.toString()}
        </Alert>
      </div>
    );
  }

  const addMockData = async () => {
    try {
      const _promises = configApi
        .getStringArray('catalog.entities')
        .map(file =>
          catalogApi.addLocation(
            'github',
            `${configApi.getString('catalog.baseUrl')}/${file}`,
          ),
        );
      await Promise.all(_promises);
      const data: Entity[] = await catalogApi.getEntities();
      setEntitiesState(data);
    } catch (err) {
      setError(err);
    }
  };
  const actions: TableProps<Entity>['actions'] = [
    (rowData: Entity) => {
      const location = findLocationForEntityMeta(rowData.metadata);
      return {
        icon: () => <GitHub fontSize="small" />,
        tooltip: 'View on GitHub',
        onClick: () => {
          if (!location) return;
          window.open(location.target, '_blank');
        },
        hidden: location?.type !== 'github',
      };
    },
    (rowData: Entity) => {
      const createEditLink = (location: LocationSpec): string => {
        switch (location.type) {
          case 'github':
            return location.target.replace('/blob/', '/edit/');
          default:
            return location.target;
        }
      };
      const location = findLocationForEntityMeta(rowData.metadata);
      return {
        icon: () => <Edit fontSize="small" />,
        tooltip: 'Edit',
        onClick: () => {
          if (!location) return;
          window.open(createEditLink(location), '_blank');
        },
        hidden: location?.type !== 'github',
      };
    },
    (rowData: Entity) => {
      const isStarred = isStarredEntity(rowData);
      return {
        cellStyle: { paddingLeft: '1em' },
        icon: () => favouriteEntityIcon(isStarred),
        tooltip: favouriteEntityTooltip(isStarred),
        onClick: () => toggleStarredEntity(rowData),
      };
    },
    {
      icon: () => <Add />,
      tooltip: 'Add example components',
      isFreeAction: true,
      onClick: () => addMockData(),
      hidden: entitiesState && entitiesState.length > 0,
    },
  ];

  return (
    <Table<Entity>
      isLoading={loading}
      columns={columns}
      options={{
        paging: false,
        actionsColumnIndex: -1,
        loadingType: 'linear',
        showEmptyDataSourceMessage: !loading,
      }}
      title={`${titlePreamble} (${(entities && entities.length) || 0})`}
      data={entitiesState}
      actions={actions}
    />
  );
};

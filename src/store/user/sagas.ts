import { all, call, put, select, takeLatest } from "redux-saga/effects";
import {
  ApiError,
  ApiResponse,
  CreateResponse,
  DeleteResponse,
} from "../../services/api-client/types";
import { User, UserToSave } from "./types";
import service from "./service";
import actions from "./actions";
import serviceGroup from "../group/service";
import { Group } from "../group/types";

export function* getUsers(
  action: ReturnType<typeof actions.getUsers.request>
): Generator {
  try {
    const effect = yield call(service.getUsers, action.payload);
    const response = effect as ApiResponse<User[]>;

    yield put(actions.getUsers.success(response.body));
  } catch (err) {
    yield put(actions.getUsers.failure(err as ApiError));
  }
}

export function* getServiceUsers(
  action: ReturnType<typeof actions.getServiceUsers.request>
): Generator {
  try {
    action.payload.queryParams = { service_user: true };
    const effect = yield call(service.getUsers, action.payload);
    const response = effect as ApiResponse<User[]>;

    yield put(actions.getServiceUsers.success(response.body));
  } catch (err) {
    yield put(actions.getServiceUsers.failure(err as ApiError));
  }
}

export function* getRegularUsers(
  action: ReturnType<typeof actions.getRegularUsers.request>
): Generator {
  try {
    action.payload.queryParams = { service_user: false };
    const effect = yield call(service.getUsers, action.payload);
    const response = effect as ApiResponse<User[]>;

    yield put(actions.getRegularUsers.success(response.body));
  } catch (err) {
    yield put(actions.getRegularUsers.failure(err as ApiError));
  }
}

export function* saveUser(
  action: ReturnType<typeof actions.saveUser.request>
): Generator {
  try {
    yield put(
      actions.setSavedUser({
        loading: true,
        success: false,
        failure: false,
        error: null,
        data: null,
      } as CreateResponse<User | null>)
    );

    const userToSave = action.payload.payload;

    let groupsToCreate = userToSave.groupsToCreate;
    if (!groupsToCreate) {
      groupsToCreate = [];
    }

    // first, create groups that were newly added by user
    const responsesGroup = yield all(
      groupsToCreate.map((g) =>
        call(serviceGroup.createGroup, {
          getAccessTokenSilently: action.payload.getAccessTokenSilently,
          payload: { name: g },
        })
      )
    );

    const resGroups = (responsesGroup as ApiResponse<Group>[])
      .filter((r) => r.statusCode === 200)
      .map((g) => g.body as Group)
      .map((g) => g.id);
    const newGroups = [...userToSave.auto_groups, ...resGroups];
    let payload = {
      name: userToSave.name,
      email: userToSave.email,
      role: userToSave.role,
      auto_groups: newGroups,
      is_service_user: userToSave.is_service_user,
      is_blocked: userToSave.is_blocked,
    } as UserToSave;

    let effect;
    if (!userToSave.id) {
      effect = yield call(service.createUser, {
        getAccessTokenSilently: action.payload.getAccessTokenSilently,
        payload: payload,
      });
    } else {
      payload.id = userToSave.id;
      effect = yield call(service.editUser, {
        getAccessTokenSilently: action.payload.getAccessTokenSilently,
        payload: payload,
      });
    }
    const response = effect as ApiResponse<User>;

    yield put(
      actions.saveUser.success({
        loading: false,
        success: true,
        failure: false,
        error: null,
        data: response.body,
      } as CreateResponse<User | null>)
    );
  } catch (err) {
    yield put(
      actions.saveUser.failure({
        loading: false,
        success: false,
        failure: false,
        error: err as ApiError,
        data: null,
      } as CreateResponse<User | null>)
    );
  }
}

export function* deleteUser(
  action: ReturnType<typeof actions.deleteUser.request>
): Generator {
  try {
    yield put(
      actions.setDeletedUser({
        loading: true,
        success: false,
        failure: false,
        error: null,
        data: null,
      } as DeleteResponse<string | null>)
    );

    const effect = yield call(service.deleteUser, action.payload);
    const response = effect as ApiResponse<any>;
    yield put(
      actions.deleteUser.success({
        loading: false,
        success: true,
        failure: false,
        error: null,
        data: response.body,
      } as DeleteResponse<string | null>)
    );
  } catch (err) {
    yield put(
      actions.deleteUser.failure({
        loading: false,
        success: false,
        failure: false,
        error: err as ApiError,
        data: null,
      } as DeleteResponse<string | null>)
    );
  }
}

export default function* sagas(): Generator {
  yield all([
    takeLatest(actions.getUsers.request, getUsers),
    takeLatest(actions.getServiceUsers.request, getServiceUsers),
    takeLatest(actions.getRegularUsers.request, getRegularUsers),
    takeLatest(actions.saveUser.request, saveUser),
    takeLatest(actions.deleteUser.request, deleteUser),
  ]);
}

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as routeActions } from "../store/route";
import {
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  SelectProps,
  message,
  Space,
  Modal,
  Typography,
} from "antd";
import { Route, RouteToSave } from "../store/route/types";
import { Header } from "antd/es/layout/layout";
import { RuleObject } from "antd/lib/form";
import {
  initPeerMaps,
  peerToPeerIP,
  routePeerSeparator,
  transformGroupedDataTable,
} from "../utils/routes";
import { useGetTokenSilently } from "../utils/token";
import { useGetGroupTagHelpers } from "../utils/groups";

const { Paragraph } = Typography;

interface FormRoute extends Route {}

const RouteAddNew = () => {
  const {
    blueTagRender,
    handleChangeTags,
    dropDownRender,
    optionRender,
    tagGroups,
    getExistingAndToCreateGroupsLists,
    getGroupNamesFromIDs,
    selectValidator,
  } = useGetGroupTagHelpers();

  const { Option } = Select;
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();
  const setupEditRouteVisible = useSelector(
    (state: RootState) => state.route.setupEditRouteVisible
  );
  const setupNewRouteHA = useSelector(
    (state: RootState) => state.route.setupNewRouteHA
  );
  const peers = useSelector((state: RootState) => state.peer.data);
  const route = useSelector((state: RootState) => state.route.route);
  const routes = useSelector((state: RootState) => state.route.data);
  const savedRoute = useSelector((state: RootState) => state.route.savedRoute);
  const [previousRouteKey, setPreviousRouteKey] = useState("");
  const [editName, setEditName] = useState(false);
  const options: SelectProps["options"] = [];
  const [formRoute, setFormRoute] = useState({} as FormRoute);
  const [form] = Form.useForm();
  const inputNameRef = useRef<any>(null);
  const [peerNameToIP, peerIPToName, peerIPToID] = initPeerMaps(peers);
  const [newRoute, setNewRoute] = useState(false);

  useEffect(() => {
    if (editName)
      inputNameRef.current!.focus({
        cursor: "end",
      });
  }, [editName]);

  useEffect(() => {
    if (!route) return;
    const fRoute = {
      ...route,
      groups: route.groups,
    } as FormRoute;
    setFormRoute(fRoute);
    setPreviousRouteKey(fRoute.network_id + fRoute.network);
    form.setFieldsValue(fRoute);

    if (!route.network_id) {
      setNewRoute(true);
    } else {
      setNewRoute(false);
    }
  }, [route]);

  peers.forEach((p) => {
    let os: string;
    os = p.os;
    if (
      !os.toLowerCase().startsWith("darwin") &&
      !os.toLowerCase().startsWith("windows") &&
      !os.toLowerCase().startsWith("android") &&
      !os.toLowerCase().startsWith("ios") &&
      route &&
      !routes
        .filter((r) => r.network_id === route.network_id)
        .find((r) => r.peer === p.id)
    ) {
      options?.push({
        label: peerToPeerIP(p.name, p.ip),
        value: peerToPeerIP(p.name, p.ip),
        disabled: false,
      });
    }
  });

  const createRouteToSave = (inputRoute: FormRoute): RouteToSave => {
    if (inputRoute.peer_groups) {
      inputRoute = {
        ...inputRoute,
        peer_groups: [
          inputRoute.peer_groups[inputRoute.peer_groups.length - 1],
        ],
      };
    }
    let peerIDList = inputRoute.peer.split(routePeerSeparator);
    let peerID: string;
    if (peerIDList.length === 1) {
      peerID = inputRoute.peer;
    } else {
      if (peerIDList[1]) {
        peerID = peerIPToID[peerIDList[1]];
      } else {
        peerID = peerIPToID[peerNameToIP[inputRoute.peer]];
      }
    }

    let [existingGroups, groupsToCreate] = getExistingAndToCreateGroupsLists(
      inputRoute.groups
    );

    const payload = {
      id: inputRoute.id,
      network: inputRoute.network,
      network_id: inputRoute.network_id,
      description: inputRoute.description,
      enabled: inputRoute.enabled,
      masquerade: inputRoute.masquerade,
      metric: inputRoute.metric,
      groups: existingGroups,
      groupsToCreate: groupsToCreate,
    } as RouteToSave;

    if (inputRoute.peer_groups) {
      let [currentPeersGroup, peerGroupsToCreate] =
        getExistingAndToCreateGroupsLists(inputRoute.peer_groups);

      let pay = {
        ...payload,
        peer_groups: currentPeersGroup,
        peerGroupsToCreate: peerGroupsToCreate,
      };
      return pay;
    }

    if (inputRoute.peer) {
      let pay = { ...payload, peer: peerID };
      return pay;
    }

    return payload;
  };

    const handleSingleChangeTags = (values: any) => {
       const lastValue = values[values.length - 1];
       if (values.length > 0) {
        form.setFieldsValue({
          peer_groups: [lastValue],
        });
      }
    };
  
  const handleFormSubmit = () => {
    form
      .validateFields()
      .then(() => {
        if (!setupNewRouteHA || formRoute.peer != "") {
          const routeToSave = createRouteToSave(formRoute);
          dispatch(
            routeActions.saveRoute.request({
              getAccessTokenSilently: getTokenSilently,
              payload: routeToSave,
            })
          );
        } else {
          let groupedDataTable = transformGroupedDataTable(routes, peers);
          groupedDataTable.forEach((group) => {
            if (group.key == previousRouteKey) {
              group.groupedRoutes.forEach((route) => {
                let updateRoute: FormRoute = {
                  ...formRoute,
                  id: route.id,
                  peer: route.peer,
                  metric: route.metric,
                  enabled:
                    formRoute.enabled != group.enabled
                      ? formRoute.enabled
                      : route.enabled,
                };
                const routeToSave = createRouteToSave(updateRoute);
                dispatch(
                  routeActions.saveRoute.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: routeToSave,
                  })
                );
              });
            }
          });
        }
      })
      .catch((errorInfo) => {
        console.log("errorInfo", errorInfo);
      });
  };

  const setVisibleNewRoute = (status: boolean) => {
    dispatch(routeActions.setSetupEditRouteVisible(status));
  };

  const setSetupNewRouteHA = (status: boolean) => {
    dispatch(routeActions.setSetupNewRouteHA(status));
  };

  const onCancel = () => {
    if (savedRoute.loading) return;
    setEditName(false);
    dispatch(
      routeActions.setRoute({
        network: "",
        network_id: "",
        description: "",
        peer: "",
        metric: 9999,
        masquerade: false,
        enabled: true,
        groups: [],
      } as Route)
    );
    setVisibleNewRoute(false);
    setSetupNewRouteHA(false);
    setPreviousRouteKey("");
    setNewRoute(false);
  };

  const onChange = (data: any) => {
    setFormRoute({ ...formRoute, ...data });
  };

  const peerDropDownRender = (menu: React.ReactElement) => <>{menu}</>;

  const toggleEditName = (status: boolean) => {
    setEditName(status);
  };

  const peerValidator = (_: RuleObject, value: string) => {
    if (value == "" && newRoute) {
      return Promise.reject(new Error("Please select routing one peer"));
    }

    return Promise.resolve();
  };

  const selectPreValidator = (obj: RuleObject, value: string[]) => {
    if (setupNewRouteHA && formRoute.peer == "" && !formRoute.peer_groups) {
      let [, newGroups] = getExistingAndToCreateGroupsLists(value);
      if (newGroups.length > 0) {
        return Promise.reject(
          new Error(
            "You can't add new Groups from the group update view, please remove:\"" +
              newGroups +
              '"'
          )
        );
      }
    }
    return selectValidator(obj, value);
  };

  return (
    <>
      {route && (
        <Modal
          open={setupEditRouteVisible}
          onCancel={onCancel}
          footer={
            <Space style={{ display: "flex", justifyContent: "end" }}>
              <Button onClick={onCancel} disabled={savedRoute.loading}>
                Cancel
              </Button>
              <Button
                type="primary"
                disabled={savedRoute.loading}
                onClick={handleFormSubmit}
              >
                {formRoute.peer_groups ? "Save" : "Add route"}
              </Button>
            </Space>
          }
        >
          <Form
            layout="vertical"
            form={form}
            requiredMark={false}
            onValuesChange={onChange}
            className="route-form"
          >
            <Row gutter={16}>
              <Col span={24}>
                <Header
                  style={{
                    border: "none",
                  }}
                >
                  <Paragraph
                    style={{
                      textAlign: "start",
                      whiteSpace: "pre-line",
                      fontSize: "18px",
                      fontWeight: 500,
                    }}
                  >
                    {formRoute.peer_groups
                      ? "Configure peer group"
                      : "Add new routing peer"}
                  </Paragraph>
                  <Paragraph
                    type={"secondary"}
                    style={{
                      textAlign: "start",
                      whiteSpace: "pre-line",
                      marginTop: "-23px",
                      fontSize: "14px",
                      paddingBottom: "25px",
                      marginBottom: "4px",
                    }}
                  >
                    {formRoute.peer_groups
                      ? "Add peer group with multiple peers to enable high availability"
                      : "When you add multiple routing peers, NetBird enables high availability"}
                  </Paragraph>

                  <Row align="top">
                    <Col span={24} style={{ lineHeight: "20px" }}>
                      <>
                        <label
                          style={{
                            color: "rgba(0, 0, 0, 0.88)",
                            fontSize: "14px",
                            fontWeight: "500",
                          }}
                        >
                          Network Identifier
                        </label>
                        <Paragraph
                          type={"secondary"}
                          style={{
                            marginTop: "-2",
                            fontWeight: "400",
                            marginBottom: "5px",
                          }}
                        >
                          Network name and CIDR that you are adding the route to
                        </Paragraph>
                        <Form.Item
                          label=""
                          rules={[
                            {
                              required: true,
                              message:
                                "Please add an identifier for this access route",
                              whitespace: true,
                            },
                          ]}
                        >
                          <Input
                            placeholder="for example “e.g. aws-eu-central-1-vpc”"
                            ref={inputNameRef}
                            disabled={true}
                            onPressEnter={() => toggleEditName(false)}
                            onBlur={() => toggleEditName(false)}
                            autoComplete="off"
                            maxLength={40}
                            value={
                              formRoute.network_id + "-" + formRoute.network
                            }
                          />
                        </Form.Item>
                      </>
                    </Col>
                  </Row>
                  <Row align="top">
                    <Col flex="auto"></Col>
                  </Row>
                </Header>
              </Col>

              <Col span={24}>
                {formRoute.peer_groups ? (
                  <>
                    <label
                      style={{
                        color: "rgba(0, 0, 0, 0.88)",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      Peer group
                    </label>
                    <Paragraph
                      type={"secondary"}
                      style={{
                        marginTop: "-2",
                        fontWeight: "400",
                        marginBottom: "5px",
                      }}
                    >
                      Assign peer group with Linux machines to be used as
                      routing peers
                    </Paragraph>
                    <Form.Item
                      name="peer_groups"
                      rules={[
                        {
                          required: true,
                          message: "Please select peer group",
                        },
                      ]}
                    >
                      <Select
                        mode="tags"
                        style={{ maxWidth: "100%" }}
                        tagRender={blueTagRender}
                        onChange={handleSingleChangeTags}
                        dropdownRender={dropDownRender}
                        optionFilterProp="serchValue"
                      >
                        {tagGroups.map((m, index) => (
                          <Option key={index} value={m.id} serchValue={m.name}>
                            {optionRender(m.name, m.id)}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </>
                ) : (
                  <>
                    <label
                      style={{
                        color: "rgba(0, 0, 0, 0.88)",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      Routing Peer
                    </label>
                    <Paragraph
                      type={"secondary"}
                      style={{
                        marginTop: "-2",
                        fontWeight: "400",
                        marginBottom: "5px",
                      }}
                    >
                      Assign a routing peer to the network. This peer has to
                      reside in the network
                    </Paragraph>
                    <Form.Item
                      name="peer"
                      rules={[
                        {
                          required: true,
                          message: "Please select routing one peer",
                        },
                      ]}
                    >
                      <Select
                        showSearch
                        style={{ width: "100%" }}
                        placeholder="Select Peer"
                        dropdownRender={peerDropDownRender}
                        options={options}
                        allowClear={true}
                      />
                    </Form.Item>
                  </>
                )}
              </Col>
              <Col span={24}>
                <label
                  style={{
                    color: "rgba(0, 0, 0, 0.88)",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Distribution groups
                </label>
                <Paragraph
                  type={"secondary"}
                  style={{
                    marginTop: "-2",
                    fontWeight: "400",
                    marginBottom: "5px",
                  }}
                >
                  Advertise this route to peers that belong to the following
                  groups
                </Paragraph>
                <Form.Item
                  name="groups"
                  label=""
                  rules={[{ validator: selectPreValidator }]}
                >
                  <Select
                    mode="tags"
                    style={{ width: "100%" }}
                    placeholder="Associate groups with the network route"
                    tagRender={blueTagRender}
                    onChange={handleChangeTags}
                    dropdownRender={dropDownRender}
                    optionFilterProp="serchValue"
                  >
                    {tagGroups.map((m, index) => (
                      <Option key={index} value={m.id} serchValue={m.name}>
                        {optionRender(m.name, m.id)}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      )}
    </>
  );
};

export default RouteAddNew;
